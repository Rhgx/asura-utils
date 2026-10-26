import { ConfigStore } from "../store/configStore.js";
import { HistoryStore, parseSeriesPath } from "../store/historyStore.js";
import { t } from "../i18n/index.js";
import type { PageControllerContext } from "./types.js";
import {
  buildKnownChapters,
  chapterNumberFromHref,
  chapterNumbersForIsland,
  findNextUnread,
  readSlugsUpTo,
} from "./chapterListLogic.js";
import type { KnownChapter } from "./chapterListLogic.js";

const TOOLBAR_ID = "au-chapter-tools";
const PICK_MODE_CLASS = "au-mark-read-mode";
const CHAPTER_LIST_SELECTOR =
  'astro-island[component-url*="ChapterListReact"], astro-island[component-url*="NovelChapterList"]';

// Chapter slugs use "-" for the decimal point, so "10-5" reads as "Ch. 10.5".
function shortChapterLabel(slug: string): string {
  return t("chapter.short", { number: slug.replace(/-/g, ".") });
}

function findChapterListIsland(): Element | null {
  return document.querySelector(CHAPTER_LIST_SELECTOR);
}

// Known chapters come from props (the full list) plus whatever anchors are rendered right now.
function knownChaptersOnPage(island: Element): KnownChapter[] {
  const hrefs = Array.from(
    island.querySelectorAll<HTMLAnchorElement>('a[href*="/chapter/"]'),
    (anchor) => anchor.getAttribute("href") || ""
  );
  const seriesPath = window.location.pathname.replace(/\/+$/, "");
  return buildKnownChapters(chapterNumbersForIsland(island), hrefs, seriesPath);
}

function nextUnreadOnPage(island: Element): KnownChapter | null {
  const entry = HistoryStore.getSeries(parseSeriesPath(window.location.pathname));
  return findNextUnread(knownChaptersOnPage(island), entry?.read ?? []);
}

function goToNextUnread(): void {
  const island = findChapterListIsland();
  const next = island ? nextUnreadOnPage(island) : null;
  if (next) window.location.href = next.href;
}

function createToolbar(toggleMarkMode: () => void): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.id = TOOLBAR_ID;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.dataset["tool"] = "next";
  nextButton.addEventListener("click", goToNextUnread);

  const markButton = document.createElement("button");
  markButton.type = "button";
  markButton.dataset["tool"] = "mark";
  markButton.addEventListener("click", toggleMarkMode);

  toolbar.append(nextButton, markButton);
  return toolbar;
}

// Only writes when the value differs, because run() is triggered by DOM mutations.
function setToolButton(
  toolbar: HTMLElement,
  tool: "next" | "mark",
  label: string,
  disabled: boolean
): void {
  const button = toolbar.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
  if (!button) return;
  if (button.textContent !== label) button.textContent = label;
  if (button.disabled !== disabled) button.disabled = disabled;
}

export const chapterToolsController = {
  applyChapterTools() {
    const island =
      this.pageContext.isSeriesPage && ConfigStore.get("trackReadingHistory")
        ? findChapterListIsland()
        : null;
    const parent = island?.parentNode;
    if (!island || !parent) {
      // Leaving the series page or turning the feature off also ends selection mode.
      this.chapterPickMode = false;
      document.body.classList.remove(PICK_MODE_CLASS);
      document.getElementById(TOOLBAR_ID)?.remove();
      return;
    }

    let toolbar = document.getElementById(TOOLBAR_ID);
    if (!toolbar) {
      toolbar = createToolbar(() => {
        this.chapterPickMode = !this.chapterPickMode;
        this.applyChapterTools();
      });
    }
    if (toolbar.nextElementSibling !== island) parent.insertBefore(toolbar, island);

    const picking = this.chapterPickMode;
    document.body.classList.toggle(PICK_MODE_CLASS, picking);
    const next = nextUnreadOnPage(island);
    setToolButton(
      toolbar,
      "next",
      next
        ? t("chapterTools.nextUnread", { chapter: shortChapterLabel(next.slug) })
        : t("chapterTools.allCaughtUp"),
      !next
    );
    setToolButton(
      toolbar,
      "mark",
      picking ? t("chapterTools.pickChapter") : t("chapterTools.markReadUpTo"),
      false
    );
  },

  markReadUpTo(island: Element, chapter: KnownChapter) {
    const seriesKey = parseSeriesPath(window.location.pathname);
    const title = document.querySelector("h1")?.textContent?.trim() || seriesKey;
    HistoryStore.setReadChapters(
      seriesKey,
      readSlugsUpTo(knownChaptersOnPage(island), chapter.number),
      { title, lastChapter: chapter.slug, lastHref: chapter.href }
    );
    this.applyHistoryUI();
    this.applyNewChapterBadges();
    this.applyChapterTools();
    this.showHint(t("hint.markedReadUpTo", { chapter: shortChapterLabel(chapter.slug) }));
  },

  // Capture phase on document so the site's own chapter link handlers never see the pick.
  handleChapterPickClick(event: MouseEvent): void {
    if (!this.chapterPickMode) return;
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest('a[href*="/chapter/"]');
    const island = findChapterListIsland();
    if (!anchor || !island?.contains(anchor)) return;

    const number = chapterNumberFromHref(anchor.getAttribute("href") || "");
    const chapter = knownChaptersOnPage(island).find((known) => known.number === number);
    if (!chapter) return;

    event.preventDefault();
    event.stopPropagation();
    this.chapterPickMode = false;
    this.markReadUpTo(island, chapter);
  },

  handleChapterPickKeyDown(event: KeyboardEvent): void {
    if (!this.chapterPickMode || event.key !== "Escape") return;
    this.chapterPickMode = false;
    this.applyChapterTools();
  },
} satisfies ThisType<PageControllerContext>;
