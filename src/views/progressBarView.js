export class ProgressBarView {
  constructor() {
    this.boundClick = null;
  }

  mount() {
    if (document.getElementById("au-progress-bar")) return;
    const bar = document.createElement("div");
    bar.id = "au-progress-bar";
    bar.innerHTML = '<div id="au-progress-bar-fill"></div>';
    document.body.appendChild(bar);

    this.boundClick = (e) => {
      const rect = bar.getBoundingClientRect();
      const pct = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      const clamped = Math.max(0, Math.min(1, pct));
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      window.scrollTo({ top: clamped * maxScroll, behavior: "smooth" });
    };
    bar.addEventListener("click", this.boundClick);
  }

  update(progressPct) {
    const fill = document.getElementById("au-progress-bar-fill");
    if (!fill) return;
    const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
    fill.style.width = `${pct}%`;
  }

  unmount() {
    const bar = document.getElementById("au-progress-bar");
    if (!bar) return;
    if (this.boundClick) bar.removeEventListener("click", this.boundClick);
    bar.remove();
    this.boundClick = null;
  }
}

