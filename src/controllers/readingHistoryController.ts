import { ConfigStore } from "../store/configStore.js";
import { HistoryStore, chapterSlugToLabel, parseReaderPath, parseSeriesPath } from "../store/historyStore.js";
import type { PageControllerContext } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Mirrors the site's own resume rules so we only defer when it will actually restore a position.
function siteHasResumePosition(seriesSlug: string, chapterName: string): boolean {
  try {
    const raw = window.localStorage.getItem(`resume:comic:${seriesSlug}`);
    if (!raw) return false;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return false;
    const entry = data[chapterName];
    if (!isRecord(entry)) return false;
    const progress = entry["progress"];
    const ts = entry["ts"];
    const position = entry["position"];
    if (typeof progress !== "number" || progress >= 0.8) return false;
    if (typeof ts !== "number" || Date.now() - ts > 5184e6) return false;
    if (!isRecord(position)) return false;
    const i = position["i"];
    const o = position["o"];
    if (typeof i !== "number" || typeof o !== "number") return false;
    // The site ignores the top-of-chapter position, so there is nothing for it to restore.
    return !(i === 0 && o < 0.15);
  } catch {
    return false;
  }
}

export const readingHistoryController = {
  applyReaderBrightness() {
    document.documentElement.style.setProperty(
      "--au-reader-brightness",
      String(ConfigStore.get("readerBrightness"))
    );
  },

  getSeriesTitleFromReader() {
    const seriesLink = this.reader ? this.reader.findSeriesLink() : null;
    const rawLinkText =
      seriesLink instanceof HTMLAnchorElement && typeof seriesLink.textContent === "string"
        ? seriesLink.textContent.trim()
        : "";
    // Breadcrumb anchors concatenate the chapter label onto the series name.
    const linkText = rawLinkText.replace(/Chapter\s+[\d.\-]+.*$/i, "").trim();
    if (linkText && linkText.length <= 90) return linkText;
    return (document.title || "")
      .replace(/\s*\|\s*Asura Scans.*$/i, "")
      .replace(/\s*Chapter\s+[\d.\-]+.*$/i, "")
      .trim();
  },

  recordReaderVisit(progress: number | null = null): void {
    if (!this.pageContext.isReader) return;
    if (!ConfigStore.get("trackReadingHistory")) return;

    const parsed = parseReaderPath(window.location.pathname);
    if (!parsed) return;

    // First write per chapter always lands. Presence pings (progress null,
    // from run()) never repeat for the same chapter; scroll-driven progress
    // writes are throttled.
    const chapterKey = this.getReaderChapterKey();
    const now = Date.now();
    const normalizedProgress = progress === null
      ? null
      : Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
    if (chapterKey !== this.historyWrittenChapterKey) {
      this.historyWrittenProgress = null;
    }
    if (chapterKey === this.historyWrittenChapterKey) {
      if (progress === null) return;
      if (normalizedProgress === this.historyWrittenProgress) return;
      if (now - this.historyWriteTs < 3000) return;
    }
    this.historyWriteTs = now;
    this.historyWrittenChapterKey = chapterKey;
    this.historyWrittenProgress = normalizedProgress;

    HistoryStore.recordVisit({
      ...parsed,
      href: window.location.pathname,
      title: this.getSeriesTitleFromReader(),
      progress: normalizedProgress,
    });
  },

  applyHistoryUI() {
    const enabled =
      ConfigStore.get("trackReadingHistory") && this.pageContext.isSeriesPage;
    const entry = enabled
      ? HistoryStore.getSeries(parseSeriesPath(window.location.pathname))
      : null;

    document
      .querySelectorAll(".au-chapter-read, .au-chapter-current")
      .forEach((el) => el.classList.remove("au-chapter-read", "au-chapter-current"));

    const existingPill = document.getElementById("au-continue-reading");
    if (!entry || !entry.lastHref) {
      if (existingPill) existingPill.remove();
      return;
    }

    this.getChapterAnchors(document).forEach((anchor) => {
      const href = anchor.getAttribute("href") || anchor.href || "";
      const parsed = parseReaderPath(href.replace(/^https?:\/\/[^/]+/, ""));
      if (!parsed) return;
      if (HistoryStore.isRead(entry, parsed.chapterSlug)) {
        anchor.classList.add("au-chapter-read");
      }
      if (parsed.chapterSlug === entry.lastChapter) {
        anchor.classList.add("au-chapter-current");
      }
    });

    const chapterList = document.querySelector(
      'astro-island[component-url*="ChapterListReact"]'
    );
    if (!chapterList || !chapterList.parentNode) {
      if (existingPill) existingPill.remove();
      return;
    }

    const progress = Number(entry.lastProgress) || 0;
    const metaText = `${chapterSlugToLabel(entry.lastChapter)} · ${
      progress >= 90 ? "finished" : `${progress}%`
    }`;

    let pill = existingPill;
    if (!pill) {
      pill = document.createElement("a");
      pill.id = "au-continue-reading";
      pill.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
        <span class="au-continue-label">Continue Reading</span>
        <span class="au-continue-meta"></span>
      `;
    }
    pill.setAttribute("href", entry.lastHref);
    const meta = pill.querySelector(".au-continue-meta");
    if (meta) meta.textContent = metaText;
    if (pill.nextElementSibling !== chapterList) {
      chapterList.parentNode.insertBefore(pill, chapterList);
    }
  },

  maybeResumeChapterPosition() {
    if (!this.pageContext.isReader) return;
    if (!ConfigStore.get("trackReadingHistory")) return;
    if (!ConfigStore.get("resumeChapterPosition")) return;

    const chapterKey = this.getReaderChapterKey();
    if (this.resumeAttemptedKey === chapterKey) return;
    this.resumeAttemptedKey = chapterKey;

    const parsed = parseReaderPath(window.location.pathname);
    if (!parsed) return;
    // The site's own resume takes precedence: it jumps on #resume and restores its saved
    // position, so scrolling here as well would move the page twice. Ours is the fallback.
    if (window.location.hash === "#resume") return;
    if (siteHasResumePosition(parsed.seriesSlug, parsed.chapterSlug)) return;
    const entry = HistoryStore.getSeries(parsed.seriesSlug);
    if (!entry || entry.lastChapter !== parsed.chapterSlug) return;

    const progress = Number(entry.lastProgress) || 0;
    if (progress < 5 || progress >= 90) return;

    // Wait for lazy chapter images to size the page before seeking.
    window.setTimeout(() => {
      if (window.scrollY > 400) return; // user already reading
      const bounds = this.reader ? this.reader.getChapterContentBounds() : null;
      let targetTop;
      if (bounds) {
        const travel = Math.max(1, bounds.endY - bounds.startY);
        targetTop = bounds.startY + (progress / 100) * travel - window.innerHeight;
      } else {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        targetTop = (progress / 100) * maxScroll;
      }
      if (targetTop > 200) {
        window.scrollTo({ top: targetTop, behavior: "auto" });
        this.showHint(`Resumed at ${progress}%`);
      }
    }, 900);
  },
} satisfies ThisType<PageControllerContext>;
