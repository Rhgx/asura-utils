import { formatPercent, t } from "../i18n/index.js";

// Keyboard seek distances, as a fraction of the scrollable page.
const SMALL_SEEK = 0.02;
const LARGE_SEEK = 0.1;

export class ProgressBarView {
  boundClick: ((event: MouseEvent) => void) | null;
  boundKeydown: ((event: KeyboardEvent) => void) | null;
  bar: HTMLDivElement | null;
  fill: HTMLDivElement | null;
  lastProgress: number | null;
  lastTitle: string | null;

  constructor() {
    this.boundClick = null;
    this.boundKeydown = null;
    this.bar = null;
    this.fill = null;
    this.lastProgress = null;
    this.lastTitle = null;
  }

  mount() {
    const existing = document.getElementById("au-progress-bar") as HTMLDivElement | null;
    if (existing) {
      this.bar = existing;
      this.fill = existing.querySelector("#au-progress-bar-fill");
      return;
    }
    const bar = document.createElement("div");
    bar.id = "au-progress-bar";
    bar.tabIndex = 0;
    bar.setAttribute("role", "slider");
    bar.setAttribute("aria-label", t("progress.label"));
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", "0");
    bar.innerHTML = '<div id="au-progress-bar-fill"></div>';
    document.body.appendChild(bar);
    this.bar = bar;
    this.fill = bar.querySelector("#au-progress-bar-fill");

    const maxScroll = () => Math.max(1, document.body.scrollHeight - window.innerHeight);
    const seekTo = (top: number) => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    };

    this.boundClick = (e: MouseEvent) => {
      const rect = bar.getBoundingClientRect();
      const pct = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      seekTo(Math.max(0, Math.min(1, pct)) * maxScroll());
    };
    bar.addEventListener("click", this.boundClick);

    this.boundKeydown = (e: KeyboardEvent) => {
      const steps: Readonly<Record<string, number>> = {
        // Up and Down move the way they do on the page itself: Down reads further.
        ArrowLeft: -SMALL_SEEK,
        ArrowUp: -SMALL_SEEK,
        ArrowRight: SMALL_SEEK,
        ArrowDown: SMALL_SEEK,
        PageUp: -LARGE_SEEK,
        PageDown: LARGE_SEEK,
      };
      let top: number;
      if (e.key === "Home") top = 0;
      else if (e.key === "End") top = maxScroll();
      else {
        const step = steps[e.key];
        if (step === undefined) return;
        top = window.scrollY + step * maxScroll();
      }
      e.preventDefault();
      e.stopPropagation();
      seekTo(top);
    };
    bar.addEventListener("keydown", this.boundKeydown);
  }

  update(progressPct: unknown, page: number, pageCount: number): void {
    const fill = this.fill?.isConnected
      ? this.fill
      : document.getElementById("au-progress-bar-fill") as HTMLDivElement | null;
    if (!fill) return;
    this.fill = fill;
    const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
    // Page changes can happen without the rounded progress changing, so the title updates first.
    const title = pageCount > 0 ? t("progress.pageTitle", { page, count: pageCount }) : null;
    if (title !== this.lastTitle && this.bar) {
      this.lastTitle = title;
      if (title) this.bar.title = title;
      else this.bar.removeAttribute("title");
    }
    if (this.bar) {
      const percent = formatPercent(pct);
      this.bar.setAttribute("aria-valuetext", title ? `${percent}, ${title}` : percent);
    }
    if (pct === this.lastProgress) return;
    this.lastProgress = pct;
    this.bar?.setAttribute("aria-valuenow", String(Math.round(pct)));
    (fill as HTMLElement).style.width = `${pct}%`;
  }

  unmount() {
    const bar = this.bar?.isConnected ? this.bar : document.getElementById("au-progress-bar");
    if (!bar) return;
    if (this.boundClick) bar.removeEventListener("click", this.boundClick);
    if (this.boundKeydown) bar.removeEventListener("keydown", this.boundKeydown);
    bar.remove();
    this.boundClick = null;
    this.boundKeydown = null;
    this.bar = null;
    this.fill = null;
    this.lastProgress = null;
    this.lastTitle = null;
  }
}
