import { CONSTANTS } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import type { ChapterDirection, ReaderStateSnapshot } from "../controllers/readerController.js";

export interface ReaderDockActions {
  toggleScroll(): void;
  setSpeed(value: unknown): number;
  stepSpeed(delta: number): number;
  setWidth(value: unknown): number;
  stepWidth(delta: number): number;
  toggleFitWidth(): boolean;
  setBrightness(value: unknown): void;
  navigate(direction: ChapterDirection): boolean;
  goSeries(): boolean;
  goTop(): void;
}

export class ReaderDockView {
  readonly onCollapsedChange: (collapsed: boolean) => void;
  shell: HTMLDivElement | null;
  panel: HTMLElement | null;
  backdrop: HTMLDivElement | null;
  collapsed: boolean;
  actions: ReaderDockActions | null;
  readonly onResize: () => void;

  constructor(onCollapsedChange: (collapsed: boolean) => void) {
    this.onCollapsedChange = onCollapsedChange;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.collapsed = true;
    this.actions = null;
    this.onResize = this.handleResize.bind(this);
  }

  isMounted() {
    return !!document.getElementById("au-reader-dock-shell");
  }

  isMobile() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  mount(actions: ReaderDockActions): void {
    this.actions = actions;

    if (this.isMounted()) {
      this.shell = document.getElementById("au-reader-dock-shell") as HTMLDivElement | null;
      this.panel = document.getElementById("au-reader-dock");
      this.backdrop = document.getElementById("au-reader-dock-backdrop") as HTMLDivElement | null;
      return;
    }

    const shell = document.createElement("div");
    shell.id = "au-reader-dock-shell";
    shell.className = "is-collapsed";
    shell.innerHTML = `
      <button id="au-reader-dock-handle" type="button" aria-label="Toggle reader tools" title="Reader tools">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6h10"></path><path d="M18 6h2"></path><path d="M4 12h2"></path><path d="M10 12h10"></path><path d="M4 18h7"></path><path d="M15 18h5"></path>
          <circle cx="16" cy="6" r="2"></circle><circle cx="8" cy="12" r="2"></circle><circle cx="13" cy="18" r="2"></circle>
        </svg>
      </button>
      <aside id="au-reader-dock" aria-label="Reader controls">
        <div class="au-dock-content">
          <div class="au-dock-header">
            <div class="au-dock-title">Reader Tools</div>
            <div id="au-dock-progress" class="au-dock-progress">0%</div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-section-label">Auto Scroll</div>
            <div class="au-dock-row">
              <span>Status</span>
              <button id="au-dock-scroll-btn" class="au-dock-btn" type="button">Start (S)</button>
            </div>
            <div class="au-dock-row">
              <span>Speed</span>
              <div class="au-dock-stepper">
                <button id="au-dock-speed-dec" class="au-dock-step" type="button">-</button>
                <input id="au-dock-speed-input" class="au-dock-num" type="number" step="0.1">
                <button id="au-dock-speed-inc" class="au-dock-step" type="button">+</button>
              </div>
            </div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-section-label">Layout</div>
            <div class="au-dock-row">
              <span>Fit Width</span>
              <button id="au-dock-fit-btn" class="au-dock-btn" type="button">Off (W)</button>
            </div>
            <div class="au-dock-row">
              <span>Width</span>
              <div class="au-dock-stepper">
                <button id="au-dock-width-dec" class="au-dock-step" type="button">-</button>
                <input id="au-dock-width-input" class="au-dock-num" type="number" step="1">
                <button id="au-dock-width-inc" class="au-dock-step" type="button">+</button>
              </div>
            </div>
            <div class="au-dock-row">
              <span>Brightness</span>
              <div class="au-dock-stepper">
                <input id="au-dock-brightness" class="au-dock-range" type="range" min="40" max="100" step="5">
                <span id="au-dock-brightness-val" class="au-dock-range-val">100%</span>
              </div>
            </div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-section-label">Navigation</div>
            <div class="au-dock-nav-grid">
              <button id="au-dock-prev" class="au-dock-nav-btn" type="button">Prev (A)</button>
              <button id="au-dock-next" class="au-dock-nav-btn" type="button">Next (D)</button>
              <button id="au-dock-series" class="au-dock-nav-btn" type="button">Series (B)</button>
              <button id="au-dock-top" class="au-dock-nav-btn" type="button">Top</button>
            </div>
          </div>

          <div class="au-dock-footer">
            Keys: S Q/E +/- A/D Arrows PgUp/PgDn B W<br>
            Double-click toggles auto-scroll
          </div>
        </div>
      </aside>
    `;

    const backdrop = document.createElement("div");
    backdrop.id = "au-reader-dock-backdrop";

    document.body.appendChild(backdrop);
    document.body.appendChild(shell);

    this.shell = shell;
    this.panel = shell.querySelector("#au-reader-dock");
    this.backdrop = backdrop;

    this.bindEvents();
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  bindEvents() {
    if (!this.shell || !this.actions) return;
    const actions = this.actions;

    const byId = <T extends HTMLElement = HTMLElement>(id: string) => this.shell!.querySelector<T>(`#${id}`);
    const handle = byId("au-reader-dock-handle");
    const scrollBtn = byId("au-dock-scroll-btn");
    const speedDec = byId("au-dock-speed-dec");
    const speedInc = byId("au-dock-speed-inc");
    const speedInput = byId<HTMLInputElement>("au-dock-speed-input");
    const widthDec = byId("au-dock-width-dec");
    const widthInc = byId("au-dock-width-inc");
    const widthInput = byId<HTMLInputElement>("au-dock-width-input");
    const fitBtn = byId("au-dock-fit-btn");
    const prevBtn = byId("au-dock-prev");
    const nextBtn = byId("au-dock-next");
    const seriesBtn = byId("au-dock-series");
    const topBtn = byId("au-dock-top");

    if (handle) handle.onclick = () => this.setCollapsed(!this.collapsed, true);
    if (scrollBtn) scrollBtn.onclick = () => actions.toggleScroll();
    if (speedDec) speedDec.onclick = () => actions.stepSpeed(-CONSTANTS.SPEED_STEP);
    if (speedInc) speedInc.onclick = () => actions.stepSpeed(CONSTANTS.SPEED_STEP);

    if (speedInput) {
      speedInput.onkeydown = (e) => e.stopPropagation();
      speedInput.onchange = (e) => actions.setSpeed((e.currentTarget as HTMLInputElement).value);
    }

    if (widthDec) widthDec.onclick = () => actions.stepWidth(-100);
    if (widthInc) widthInc.onclick = () => actions.stepWidth(100);
    if (widthInput) {
      widthInput.onkeydown = (e) => e.stopPropagation();
      widthInput.onchange = (e) => actions.setWidth((e.currentTarget as HTMLInputElement).value);
    }
    if (fitBtn) fitBtn.onclick = () => actions.toggleFitWidth();

    const brightness = byId<HTMLInputElement>("au-dock-brightness");
    if (brightness) {
      brightness.onkeydown = (e) => e.stopPropagation();
      brightness.oninput = (e) => actions.setBrightness((e.currentTarget as HTMLInputElement).value);
    }

    const mobileClose = () => {
      if (this.isMobile()) this.setCollapsed(true, true);
    };
    if (prevBtn) prevBtn.onclick = () => { actions.navigate("prev"); mobileClose(); };
    if (nextBtn) nextBtn.onclick = () => { actions.navigate("next"); mobileClose(); };
    if (seriesBtn) seriesBtn.onclick = () => { actions.goSeries(); mobileClose(); };
    if (topBtn) topBtn.onclick = () => { actions.goTop(); mobileClose(); };
    if (this.backdrop) this.backdrop.onclick = () => this.setCollapsed(true, true);
  }

  handleResize() {
    this.updateBackdropState();
  }

  setCollapsed(value: boolean, persist: boolean): void {
    this.collapsed = !!value;
    if (this.shell) this.shell.classList.toggle("is-collapsed", this.collapsed);
    this.updateBackdropState();
    if (persist) ConfigStore.set("readerDockCollapsed", this.collapsed);
    if (this.onCollapsedChange) this.onCollapsedChange(this.collapsed);
  }

  updateBackdropState() {
    if (!this.backdrop) return;
    const show = this.isMobile() && !this.collapsed;
    this.backdrop.classList.toggle("visible", show);
  }

  sync(state: ReaderStateSnapshot): void {
    if (!this.shell) return;

    const byId = <T extends HTMLElement = HTMLElement>(id: string) => this.shell!.querySelector<T>(`#${id}`);
    const progress = byId("au-dock-progress");
    const scrollBtn = byId("au-dock-scroll-btn");
    const speedInput = byId<HTMLInputElement>("au-dock-speed-input");
    const widthInput = byId<HTMLInputElement>("au-dock-width-input");
    const fitBtn = byId("au-dock-fit-btn");
    const prevBtn = byId<HTMLButtonElement>("au-dock-prev");
    const nextBtn = byId<HTMLButtonElement>("au-dock-next");
    const seriesBtn = byId<HTMLButtonElement>("au-dock-series");
    const widthDec = byId<HTMLButtonElement>("au-dock-width-dec");
    const widthInc = byId<HTMLButtonElement>("au-dock-width-inc");

    if (progress) progress.textContent = `${state.progress}%`;
    if (scrollBtn) {
      scrollBtn.textContent = state.isScrolling ? "Stop (S)" : "Start (S)";
      scrollBtn.classList.toggle("active", state.isScrolling);
    }
    if (speedInput) speedInput.value = String(state.speed);
    if (widthInput) widthInput.value = String(state.width);

    const brightness = byId<HTMLInputElement>("au-dock-brightness");
    const brightnessVal = byId("au-dock-brightness-val");
    if (brightness && document.activeElement !== brightness) {
      brightness.value = String(state.brightness);
    }
    if (brightnessVal) brightnessVal.textContent = `${state.brightness}%`;
    if (fitBtn) {
      fitBtn.textContent = state.fitWidth ? "On (W)" : "Off (W)";
      fitBtn.classList.toggle("active", state.fitWidth);
    }

    const widthDisabled = !!state.fitWidth;
    if (widthInput) widthInput.disabled = widthDisabled;
    if (widthDec) widthDec.disabled = widthDisabled;
    if (widthInc) widthInc.disabled = widthDisabled;
    if (prevBtn) prevBtn.disabled = !state.canPrev;
    if (nextBtn) nextBtn.disabled = !state.canNext;
    if (seriesBtn) seriesBtn.disabled = !state.hasSeries;
    if (this.shell) this.shell.classList.toggle("is-scrolling", !!state.isScrolling);
  }

  unmount() {
    if (this.shell) this.shell.remove();
    if (this.backdrop) this.backdrop.remove();
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.actions = null;
    window.removeEventListener("resize", this.onResize);
  }
}
