import { ConfigStore } from "../store/configStore.js";
import type { ChapterEndAction } from "../config/defaults.js";
import type { ChapterAccessResult, PageControllerContext } from "./types.js";
import { CHAPTER_IMAGE_SELECTOR } from "./readerConstants.js";
import { findChapterReaderInfo, formatUnlockCountdown } from "./chapterProps.js";

const PREFETCH_PROGRESS_PERCENT = 70;
const PREFETCH_PAGE_COUNT = 3;

export const chapterEndController = {
  getReaderChapterKey() {
    return `${window.location.pathname || ""}${window.location.search || ""}`;
  },

  refreshEndActionChapterState() {
    const chapterKey = this.pageContext.isReader ? this.getReaderChapterKey() : "";
    if (chapterKey === this.endActionChapterKey) return;
    this.endActionChapterKey = chapterKey;
    this.endActionCompleted = false;
    this.endActionInFlight = false;
  },

  isNearPageEnd() {
    const contentEndY = this.reader && this.reader.getChapterContentEndY
      ? this.reader.getChapterContentEndY()
      : null;
    if (typeof contentEndY === "number" && Number.isFinite(contentEndY) && contentEndY > 0) {
      const viewportBottom = window.scrollY + window.innerHeight;
      const threshold = Math.max(160, Math.round(window.innerHeight * 0.12));
      return viewportBottom >= contentEndY - threshold;
    }

    const root = document.documentElement;
    if (!root) return false;
    const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
    if (maxScroll <= 1) return false;
    const remaining = maxScroll - window.scrollY;
    const fallbackThreshold = Math.max(220, Math.round(window.innerHeight * 0.2));
    return remaining <= fallbackThreshold;
  },

  getChapterImageCount(root = document) {
    if (!root || !root.querySelectorAll) return 0;
    const primaryCount = root.querySelectorAll(CHAPTER_IMAGE_SELECTOR).length;
    if (primaryCount > 0) return primaryCount;
    const readerInfo = findChapterReaderInfo(root);
    if (typeof readerInfo?.pageCount === "number") return readerInfo.pageCount;
    const chapterReaderIsland = root.querySelector?.(
      'astro-island[component-url*="ChapterReader"]'
    );
    const readerProps = chapterReaderIsland?.getAttribute?.("props") || "";
    return readerProps.includes("/asura-images/chapters/") ? 1 : 0;
  },

  hasPremiumLockSignals(root = document) {
    if (!root) return false;
    // The reader props carry the server's lock state, so they win over page heuristics.
    const propsLocked = findChapterReaderInfo(root)?.isLocked;
    if (typeof propsLocked === "boolean") return propsLocked;
    if (/-\s*premium\s*\|/i.test(root.title)) return true;

    const textSource = root.body?.textContent || root.textContent || "";
    const bodyText = textSource.toLowerCase();
    const premiumPhrases = [
      "chapter is locked",
      "this chapter is locked",
      "premium chapter",
      "premium only",
      "unlock chapter",
      "members only chapter",
      "for premium members",
    ];
    return premiumPhrases.some((token) => bodyText.includes(token));
  },

  isLikelyPremiumLockedCurrentChapter() {
    const propsLocked = findChapterReaderInfo(document)?.isLocked;
    if (typeof propsLocked === "boolean") return propsLocked;
    const chapterImageCount = this.getChapterImageCount(document);
    if (chapterImageCount > 0) return false;
    return this.hasPremiumLockSignals(document);
  },

  showEndActionHint(message: string): void {
    const now = Date.now();
    if (now - this.endActionHintTs < 2400) return;
    this.endActionHintTs = now;
    this.showHint(message);
  },

  async maybeRunChapterEndAction() {
    if (!this.pageContext.isReader) return;

    const actionMode = ConfigStore.get("chapterEndAction");
    if (!actionMode || actionMode === "off") return;

    this.refreshEndActionChapterState();
    if (this.endActionCompleted || this.endActionInFlight) return;
    if (!this.isNearPageEnd()) return;

    if (!ConfigStore.get("hasPremiumAccess") && this.isLikelyPremiumLockedCurrentChapter()) {
      this.endActionCompleted = true;
      const countdown = formatUnlockCountdown(findChapterReaderInfo(document)?.unlockTime ?? null, Date.now());
      this.showEndActionHint(
        countdown
          ? `Premium-locked chapter, unlocks ${countdown}`
          : "End Action skipped: Premium-locked chapter detected"
      );
      return;
    }

    this.endActionInFlight = true;
    try {
      const handled = await this.performSmartEndAction(actionMode);
      if (handled) this.endActionCompleted = true;
    } finally {
      this.endActionInFlight = false;
    }
  },

  async probeChapterAccess(url: unknown): Promise<ChapterAccessResult> {
    if (ConfigStore.get("hasPremiumAccess")) {
      return { allowed: true, reason: "has_premium_access" };
    }

    const targetUrl = String(url || "").trim();
    if (!targetUrl) return { allowed: false, reason: "missing_url" };

    const cached = this.chapterAccessCache.get(targetUrl);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);

    let result: ChapterAccessResult;
    try {
      const response = await fetch(targetUrl, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) {
        // A transient probe failure must not make a publicly accessible chapter
        // look premium-locked; only explicit lock signals block navigation.
        result = { allowed: true, reason: "request_failed_allow" };
      } else {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const readerInfo = findChapterReaderInfo(doc);
        const propsLocked = readerInfo?.isLocked;
        const chapterImageCount = this.getChapterImageCount(doc);
        if (typeof propsLocked === "boolean") {
          result = {
            allowed: !propsLocked,
            reason: propsLocked ? "premium_locked" : "reader_props_unlocked",
            unlockTime: readerInfo?.unlockTime ?? null,
          };
        } else if (chapterImageCount > 0) {
          result = { allowed: true, reason: "reader_images_present" };
        } else {
          const hasPremiumSignals = this.hasPremiumLockSignals(doc);
          result = {
            allowed: !hasPremiumSignals,
            reason: hasPremiumSignals ? "premium_locked" : "inconclusive_allow",
          };
        }
        if (result.allowed) result.pageUrls = readerInfo?.pageUrls ?? [];
      }
    } catch (_error) {
      // Fail open for timeouts and network errors for the same reason as non-2xx responses.
      result = { allowed: true, reason: "request_error_allow" };
    } finally {
      window.clearTimeout(timeout);
    }

    this.chapterAccessCache.set(targetUrl, result);
    return result;
  },

  async maybePrefetchNextChapter(): Promise<void> {
    if (!this.pageContext.isReader || !ConfigStore.get("readerWidget")) return;

    const chapterKey = this.getReaderChapterKey();
    if (this.prefetchedChapterKey === chapterKey) return;

    const bounds = this.reader.getChapterContentBounds();
    if (!bounds) return;
    if (this.reader.getProgress(bounds) < PREFETCH_PROGRESS_PERCENT) return;

    // Mark the chapter before awaiting so scroll frames that run during the probe do not start another one.
    this.prefetchedChapterKey = chapterKey;
    const nextTarget = this.reader.getChapterNavTarget("next");
    if (!nextTarget || !nextTarget.href) return;

    const access = await this.probeChapterAccess(nextTarget.href);
    if (!access.allowed || !access.pageUrls?.length) return;
    for (const url of access.pageUrls.slice(0, PREFETCH_PAGE_COUNT)) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    }
  },

  async tryNavigateNextChapterWithPremiumCheck() {
    const nextTarget = this.reader?.getChapterNavTarget("next");
    if (!nextTarget || !nextTarget.href) return false;

    const access = await this.probeChapterAccess(nextTarget.href);
    if (!access.allowed) {
      const countdown = formatUnlockCountdown(access.unlockTime ?? null, Date.now());
      this.showEndActionHint(
        countdown
          ? `End Action: Next chapter unlocks ${countdown}`
          : "End Action: Next chapter blocked (premium lock)"
      );
      return false;
    }

    nextTarget.click();
    return true;
  },

  stopReaderAutoScrollForEndAction() {
    if (!this.reader) return;
    if (!this.reader.isScrolling()) return false;
    this.reader.stopScroll();
    this.reader.emitState();
    return true;
  },

  async performSmartEndAction(actionMode: ChapterEndAction): Promise<boolean> {
    const reader = this.reader;
    if (!reader) return false;
    if (actionMode === "stopScroll") {
      const stopped = this.stopReaderAutoScrollForEndAction();
      if (!stopped) return false;
      this.showEndActionHint("End Action: Auto-scroll stopped");
      return true;
    }

    if (actionMode === "seriesPage") {
      if (reader.goSeries()) {
        return true;
      }
      if (await this.tryNavigateNextChapterWithPremiumCheck()) {
        return true;
      }
      this.stopReaderAutoScrollForEndAction();
      this.showEndActionHint("End Action: No destination");
      return true;
    }

    if (actionMode === "nextChapter") {
      if (await this.tryNavigateNextChapterWithPremiumCheck()) {
        return true;
      }
      if (reader.goSeries()) {
        this.showEndActionHint("End Action: Falling back to series page");
        return true;
      }
      this.stopReaderAutoScrollForEndAction();
      this.showEndActionHint("End Action: No destination");
      return true;
    }

    return false;
  },
} satisfies ThisType<PageControllerContext>;
