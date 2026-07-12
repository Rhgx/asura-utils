import { CONSTANTS } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import { CHAPTER_IMAGE_SELECTOR } from "./readerConstants.js";

export class ReaderController {
  readonly onStateChange: (state: ReaderStateSnapshot) => void;
  readonly onHint: (message: string) => void;
  readonly state: ReaderState;

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
      speed: ConfigStore.get("autoScrollSpeed"),
      width: ConfigStore.get("imageWidth"),
    };
  }

  start() {
    this.state.speed = ConfigStore.get("autoScrollSpeed");
    this.state.width = ConfigStore.get("imageWidth");
    this.applyWidth();
    this.emitState();
  }

  stop() {
    this.stopScroll();
    this.state.accumulatedScroll = 0;
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

    const scale = this.state.width / CONSTANTS.BASE_WIDTH;
    this.state.accumulatedScroll += (this.state.speed / 2) * scale;
    const step = Math.floor(this.state.accumulatedScroll);

    if (step >= 1) {
      window.scrollBy(0, step);
      this.state.accumulatedScroll -= step;
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
  }

  getProgress(): number {
    const chapterBounds = this.getChapterContentBounds();
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
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(CHAPTER_IMAGE_SELECTOR));
    if (images.length === 0) return null;

    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = 0;

    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (!rect || rect.width < 20 || rect.height < 20) return;
      const absTop = window.scrollY + rect.top;
      const absBottom = window.scrollY + rect.bottom;
      minTop = Math.min(minTop, absTop);
      maxBottom = Math.max(maxBottom, absBottom);
    });

    if (!Number.isFinite(minTop) || maxBottom <= minTop) return null;
    return {
      startY: minTop,
      endY: maxBottom,
    };
  }

  getChapterContentEndY(): number | null {
    const bounds = this.getChapterContentBounds();
    return bounds ? bounds.endY : null;
  }

  findSeriesLink(): HTMLAnchorElement | { href: string } | null {
    const directLink = document.querySelector<HTMLAnchorElement>(
      'a[href*="/comics/"]:not([href*="/chapter/"]), a[href*="/series/"]:not([href*="/chapter/"])'
    );
    if (directLink) return directLink;

    const path = window.location.pathname || "";
    const match = path.match(/^\/(comics|series)\/([^/]+)\/chapter\/[^/]+/);
    if (!match) return null;

    return {
      href: `${window.location.origin}/${match[1]}/${match[2]}`,
    };
  }

  hasSeriesLink() {
    return !!this.findSeriesLink();
  }

  getChapterNavTarget(direction: ChapterDirection): HTMLAnchorElement | null {
    const keyword = direction === "next" ? "next" : "prev";
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));

    const direct = links.find((a) => {
      if (!a.href || !a.href.includes("/chapter/")) return false;
      const txt = (a.textContent || "").trim().toLowerCase();
      return txt.includes(keyword);
    });
    if (direct) return direct;

    const fallback = links.find((a) => {
      const txt = (a.textContent || "").trim().toLowerCase();
      return txt.includes(keyword);
    });
    return fallback || null;
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
    this.onHint(next ? "Fit Width: ON" : "Fit Width: OFF");
    this.emitState();
    return next;
  }

  getStateSnapshot(): ReaderStateSnapshot {
    return {
      isScrolling: this.state.isScrolling,
      speed: this.state.speed,
      width: this.state.width,
      fitWidth: ConfigStore.get("fitWidthMode"),
      brightness: ConfigStore.get("readerBrightness"),
      progress: this.getProgress(),
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
  speed: number;
  width: number;
}

export interface ChapterBounds {
  startY: number;
  endY: number;
}

export interface ReaderStateSnapshot {
  isScrolling: boolean;
  speed: number;
  width: number;
  fitWidth: boolean;
  brightness: number;
  progress: number;
  canPrev: boolean;
  canNext: boolean;
  hasSeries: boolean;
}
