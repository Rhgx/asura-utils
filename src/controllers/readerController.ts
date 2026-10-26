import { CONSTANTS } from "../config/defaults.js";
import { KEYBIND_FIELDS, matchesBinding } from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { t } from "../i18n/index.js";
import { CHAPTER_IMAGE_SELECTOR, NOVEL_TEXT_SELECTOR } from "./readerConstants.js";
import { getCurrentPageIndex, getPageJumpIndex } from "./pageNavLogic.js";
import type { PageDirection } from "./pageNavLogic.js";

// Novel chapters live under /novels/ and have no chapter images to measure.
function isNovelPath(): boolean {
  return /^\/novels\//.test(window.location.pathname || "");
}

// How long auto-scroll waits after the last manual scroll input before resuming.
const MANUAL_HOLD_MS = 1200;
// Space reports as " " in KeyboardEvent.key.
const MANUAL_SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

export class ReaderController {
  readonly onStateChange: (state: ReaderStateSnapshot) => void;
  readonly onHint: (message: string) => void;
  readonly state: ReaderState;
  private chapterImages: HTMLImageElement[] | null = null;
  private chapterBounds: ChapterBounds | null | undefined;
  // Absolute top Y of each measured chapter image, cached with chapterBounds so page lookups never read layout.
  private pageTops: number[] = [];
  private navTargets = new Map<ChapterDirection, HTMLAnchorElement | null>();
  private seriesLink: HTMLAnchorElement | { href: string } | null | undefined;
  private imageResizeObserver: ResizeObserver | null = null;
  private manualInputBound = false;

  constructor(
    onStateChange: (state: ReaderStateSnapshot) => void,
    onHint: (message: string) => void,
  ) {
    this.onStateChange = onStateChange;
    this.onHint = onHint;
    this.state = {
      isScrolling: false,
      accumulatedScroll: 0,
      rafId: 0,
      manualHoldUntil: 0,
      speed: ConfigStore.get("autoScrollSpeed"),
      width: ConfigStore.get("imageWidth"),
    };
  }

  start() {
    this.invalidateDocumentCache();
    this.bindManualInputListeners();
    this.state.speed = ConfigStore.get("autoScrollSpeed");
    this.state.width = ConfigStore.get("imageWidth");
    this.applyWidth();
    this.emitState();
  }

  // Manual wheel, touch and scroll-key input holds auto-scroll briefly instead of stopping it,
  // so the loop does not fight the reader. Our own scrollBy calls never trigger this.
  private bindManualInputListeners() {
    if (this.manualInputBound) return;
    this.manualInputBound = true;

    window.addEventListener("wheel", () => this.holdAutoScroll(), { passive: true });
    window.addEventListener("touchstart", () => this.holdAutoScroll(), { passive: true });
    window.addEventListener("touchmove", () => this.holdAutoScroll(), { passive: true });
    window.addEventListener("keydown", (e) => this.handleManualScrollKey(e));
  }

  private handleManualScrollKey(e: KeyboardEvent) {
    if (!MANUAL_SCROLL_KEYS.has(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (
      target &&
      (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }
    // Keys bound to script actions are not scroll input, even if their handler did not stop propagation.
    if (KEYBIND_FIELDS.some((field) => matchesBinding(e, ConfigStore.get(field.key)))) return;
    this.holdAutoScroll();
  }

  private holdAutoScroll() {
    if (!this.state.isScrolling) return;
    this.state.manualHoldUntil = performance.now() + MANUAL_HOLD_MS;
  }

  stop() {
    this.stopScroll();
    this.state.accumulatedScroll = 0;
    this.imageResizeObserver?.disconnect();
    this.imageResizeObserver = null;
    this.emitState();
  }

  stopScroll() {
    this.state.isScrolling = false;
    if (this.state.rafId) {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = 0;
    }
  }

  isScrolling() {
    return this.state.isScrolling;
  }

  toggleScroll() {
    this.state.isScrolling = !this.state.isScrolling;
    if (this.state.isScrolling) {
      this.scrollLoop();
    } else {
      this.stopScroll();
    }
    this.emitState();
  }

  scrollLoop() {
    if (!this.state.isScrolling) return;

    // While held, skip accumulation too so the reader does not jump when the hold ends.
    if (performance.now() >= this.state.manualHoldUntil) {
      // Keep fractional movement between frames so low speeds still scroll smoothly.
      // Image width only scales auto-scroll for comics; novel text has no width setting.
      const scale = isNovelPath() ? 1 : this.state.width / CONSTANTS.BASE_WIDTH;
      this.state.accumulatedScroll += (this.state.speed / 2) * scale;
      const step = Math.floor(this.state.accumulatedScroll);

      if (step >= 1) {
        window.scrollBy(0, step);
        this.state.accumulatedScroll -= step;
      }
    }

    this.state.rafId = requestAnimationFrame(() => this.scrollLoop());
  }

  setSpeed(value: unknown): number {
    const speed = ConfigStore.set("autoScrollSpeed", value);
    this.state.speed = speed;
    this.emitState();
    return speed;
  }

  stepSpeed(delta: number): number {
    return this.setSpeed(this.state.speed + delta);
  }

  setWidth(value: unknown): number {
    if (ConfigStore.get("fitWidthMode")) {
      this.emitState();
      return this.state.width;
    }
    const width = ConfigStore.set("imageWidth", value);
    this.state.width = width;
    this.applyWidth();
    this.emitState();
    return width;
  }

  stepWidth(delta: number): number {
    return this.setWidth(this.state.width + delta);
  }

  applyWidth() {
    document.documentElement.style.setProperty(
      "--comic-width",
      `${this.state.width}px`
    );
    this.invalidateGeometry();
  }

  invalidateGeometry(): void {
    this.chapterBounds = undefined;
  }

  invalidateDocumentCache(): void {
    this.imageResizeObserver?.disconnect();
    this.imageResizeObserver = null;
    this.chapterImages = null;
    this.chapterBounds = undefined;
    this.navTargets.clear();
    this.seriesLink = undefined;
  }

  getProgress(chapterBounds = this.getChapterContentBounds()): number {
    if (chapterBounds) {
      const viewportBottom = window.scrollY + window.innerHeight;
      const travel = Math.max(
        1,
        chapterBounds.endY - chapterBounds.startY
      );
      const current = viewportBottom - chapterBounds.startY;
      const pct = Math.round((current / travel) * 100);
      return Math.max(0, Math.min(100, pct));
    }

    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const pct = Math.round((window.scrollY / maxScroll) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  getChapterContentBounds(): ChapterBounds | null {
    if (this.chapterBounds !== undefined) return this.chapterBounds;
    const images = this.chapterImages ?? Array.from(
      document.querySelectorAll<HTMLImageElement>(CHAPTER_IMAGE_SELECTOR)
    );
    this.chapterImages = images;
    if (
      !this.imageResizeObserver &&
      typeof ResizeObserver === "function" &&
      images.length > 0
    ) {
      // Lazy-loaded images change the page height after their initial DOM insertion.
      this.imageResizeObserver = new ResizeObserver(() => this.invalidateGeometry());
      images.forEach((image) => this.imageResizeObserver?.observe(image));
    }
    if (images.length === 0) {
      this.pageTops = [];
      this.chapterBounds = this.measureNovelText();
      return this.chapterBounds;
    }

    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = 0;
    const pageTops: number[] = [];

    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (!rect || rect.width < 20 || rect.height < 20) return;
      const absTop = window.scrollY + rect.top;
      const absBottom = window.scrollY + rect.bottom;
      minTop = Math.min(minTop, absTop);
      maxBottom = Math.max(maxBottom, absBottom);
      pageTops.push(absTop);
    });
    this.pageTops = pageTops;

    if (!Number.isFinite(minTop) || maxBottom <= minTop) {
      this.chapterBounds = null;
      return null;
    }
    this.chapterBounds = {
      startY: minTop,
      endY: maxBottom,
    };
    return this.chapterBounds;
  }

  // Measures from the first paragraph's top to the last paragraph's bottom, so progress and chapter end work for novel text.
  private measureNovelText(): ChapterBounds | null {
    const paragraphs = Array.from(document.querySelectorAll<HTMLElement>(NOVEL_TEXT_SELECTOR));
    const first = paragraphs[0];
    const last = paragraphs[paragraphs.length - 1];
    if (!first || !last) return null;

    if (!this.imageResizeObserver && typeof ResizeObserver === "function") {
      // Text reflows when the width changes, so observe the container that wraps the paragraphs.
      this.imageResizeObserver = new ResizeObserver(() => this.invalidateGeometry());
      this.imageResizeObserver.observe(first.parentElement ?? first);
    }

    const startY = window.scrollY + first.getBoundingClientRect().top;
    const endY = window.scrollY + last.getBoundingClientRect().bottom;
    if (!Number.isFinite(startY) || endY <= startY) return null;
    return { startY, endY };
  }

  // Page numbers come from the cached tops, so this is cheap enough to run on every scroll frame.
  getPagePosition(): PagePosition | null {
    if (isNovelPath()) return null;
    this.getChapterContentBounds();
    if (this.pageTops.length === 0) return null;
    return {
      page: getCurrentPageIndex(this.pageTops, window.scrollY, window.innerHeight) + 1,
      pageCount: this.pageTops.length,
    };
  }

  jumpPage(direction: PageDirection): void {
    if (isNovelPath()) return;
    this.getChapterContentBounds();
    const tops = this.pageTops;
    if (tops.length === 0) return;

    const index = getPageJumpIndex(tops, window.scrollY, window.innerHeight, direction);
    if (index === null) {
      this.onHint(t(direction === "next" ? "hint.lastPage" : "hint.firstPage"));
      return;
    }
    const top = tops[index];
    if (top === undefined) return;
    // Instant scroll keeps auto-scroll and the progress bar in step with the new position.
    window.scrollTo({ top, behavior: "auto" });
    this.onHint(t("hint.pageCounter", { page: index + 1, total: tops.length }));
  }

  getChapterContentEndY(): number | null {
    const bounds = this.getChapterContentBounds();
    return bounds ? bounds.endY : null;
  }

  findSeriesLink(): HTMLAnchorElement | { href: string } | null {
    if (this.seriesLink !== undefined) return this.seriesLink;
    // Novel pages only offer novel series links, and comic pages never pick a novel link.
    const directSelector = isNovelPath()
      ? 'a[href*="/novels/"]:not([href*="/chapter/"])'
      : 'a[href*="/comics/"]:not([href*="/chapter/"]), a[href*="/series/"]:not([href*="/chapter/"])';
    const directLink = document.querySelector<HTMLAnchorElement>(directSelector);
    if (directLink) {
      this.seriesLink = directLink;
      return directLink;
    }

    const path = window.location.pathname || "";
    // Some reader layouts omit the breadcrumb, so rebuild the series URL from the path.
    const match = path.match(/^\/(comics|series|novels)\/([^/]+)\/chapter\/[^/]+/);
    if (!match) {
      this.seriesLink = null;
      return null;
    }

    this.seriesLink = {
      href: `${window.location.origin}/${match[1]}/${match[2]}`,
    };
    return this.seriesLink;
  }

  hasSeriesLink() {
    return !!this.findSeriesLink();
  }

  getChapterNavTarget(direction: ChapterDirection): HTMLAnchorElement | null {
    if (this.navTargets.has(direction)) return this.navTargets.get(direction) ?? null;
    const keyword = direction === "next" ? "next" : "prev";
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));

    // The chapter <head> carries rel=prev/next links, which are the most reliable source.
    const relHref = document
      .querySelector<HTMLLinkElement>(`link[rel="${direction}"]`)
      ?.getAttribute("href");
    if (relHref) {
      const targetHref = new URL(relHref, window.location.href).href;
      let linked: HTMLAnchorElement | null = links.find((a) => a.href === targetHref) ?? null;
      // A detached anchor still navigates on click, so it works when the page has no matching link.
      if (!linked) {
        linked = document.createElement("a");
        linked.href = targetHref;
      }
      this.navTargets.set(direction, linked);
      return linked;
    }

    const direct = links.find((a) => {
      if (!a.href || !a.href.includes("/chapter/")) return false;
      const txt = (a.textContent || "").trim().toLowerCase();
      return txt.includes(keyword);
    });
    const target = direct || null;
    this.navTargets.set(direction, target);
    return target;
  }

  canNavigate(direction: ChapterDirection): boolean {
    return !!this.getChapterNavTarget(direction);
  }

  navigate(direction: ChapterDirection): boolean {
    const target = this.getChapterNavTarget(direction);
    if (!target) {
      this.emitState();
      return false;
    }
    target.click();
    return true;
  }

  goSeries() {
    const seriesLink = this.findSeriesLink();
    if (!seriesLink) {
      this.emitState();
      return false;
    }
    window.location.href = seriesLink.href;
    return true;
  }

  goTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  toggleFitWidth() {
    const next = ConfigStore.toggle("fitWidthMode");
    document.body.classList.toggle("au-fit-width", next);
    this.onHint(t(next ? "hint.fitWidthOn" : "hint.fitWidthOff"));
    this.emitState();
    return next;
  }

  getStateSnapshot(progress = this.getProgress()): ReaderStateSnapshot {
    const position = this.getPagePosition();
    return {
      isScrolling: this.state.isScrolling,
      speed: this.state.speed,
      width: this.state.width,
      fitWidth: ConfigStore.get("fitWidthMode"),
      brightness: ConfigStore.get("readerBrightness"),
      progress,
      page: position?.page ?? 0,
      pageCount: position?.pageCount ?? 0,
      canPrev: this.canNavigate("prev"),
      canNext: this.canNavigate("next"),
      hasSeries: this.hasSeriesLink(),
    };
  }

  emitState() {
    if (this.onStateChange) this.onStateChange(this.getStateSnapshot());
  }
}

export type ChapterDirection = "prev" | "next";

interface ReaderState {
  isScrolling: boolean;
  accumulatedScroll: number;
  rafId: number;
  manualHoldUntil: number;
  speed: number;
  width: number;
}

export interface ChapterBounds {
  startY: number;
  endY: number;
}

export interface PagePosition {
  page: number;
  pageCount: number;
}

export interface ReaderStateSnapshot {
  isScrolling: boolean;
  speed: number;
  width: number;
  fitWidth: boolean;
  brightness: number;
  progress: number;
  // Both are 0 when the page is not a comic with measured images.
  page: number;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  hasSeries: boolean;
}
