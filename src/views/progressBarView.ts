import { t } from "../i18n/index.js";

export class ProgressBarView {
  boundClick: ((event: MouseEvent) => void) | null;
  bar: HTMLDivElement | null;
  fill: HTMLDivElement | null;
  lastProgress: number | null;
  lastTitle: string | null;

  constructor() {
    this.boundClick = null;
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
    bar.innerHTML = '<div id="au-progress-bar-fill"></div>';
    document.body.appendChild(bar);
    this.bar = bar;
    this.fill = bar.querySelector("#au-progress-bar-fill");

    this.boundClick = (e: MouseEvent) => {
      const rect = bar.getBoundingClientRect();
      const pct = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      const clamped = Math.max(0, Math.min(1, pct));
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      window.scrollTo({ top: clamped * maxScroll, behavior: "smooth" });
    };
    bar.addEventListener("click", this.boundClick);
  }

  update(progressPct: unknown, page: number, pageCount: number): void {
    const fill = this.fill?.isConnected
      ? this.fill
      : document.getElementById("au-progress-bar-fill") as HTMLDivElement | null;
    if (!fill) return;
    this.fill = fill;
    // Page changes can happen without the rounded progress changing, so the title updates first.
    const title = pageCount > 0 ? t("progress.pageTitle", { page, count: pageCount }) : null;
    if (title !== this.lastTitle && this.bar) {
      this.lastTitle = title;
      if (title) this.bar.title = title;
      else this.bar.removeAttribute("title");
    }
    const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
    if (pct === this.lastProgress) return;
    this.lastProgress = pct;
    (fill as HTMLElement).style.width = `${pct}%`;
  }

  unmount() {
    const bar = this.bar?.isConnected ? this.bar : document.getElementById("au-progress-bar");
    if (!bar) return;
    if (this.boundClick) bar.removeEventListener("click", this.boundClick);
    bar.remove();
    this.boundClick = null;
    this.bar = null;
    this.fill = null;
    this.lastProgress = null;
    this.lastTitle = null;
  }
}
