import { CONSTANTS } from "../config/defaults.js";
import type { ChapterDirection, ReaderStateSnapshot } from "../controllers/readerController.js";
import type { PageDirection } from "../controllers/pageNavLogic.js";
import { formatPercent, t } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";

export interface ReaderDockActions {
  toggleScroll(): void;
  setSpeed(value: unknown): number;
  stepSpeed(delta: number): number;
  setWidth(value: unknown): number;
  stepWidth(delta: number): number;
  toggleFitWidth(): boolean;
  setBrightness(value: unknown): void;
  navigate(direction: ChapterDirection): boolean;
  jumpPage(direction: PageDirection): void;
  goSeries(): boolean;
  goTop(): void;
  openSettings(): void;
}

export class ReaderDockView {
  readonly onCollapsedChange: (collapsed: boolean) => void;
  shell: HTMLDivElement | null;
  panel: HTMLElement | null;
  backdrop: HTMLDivElement | null;
  collapsed: boolean;
  actions: ReaderDockActions | null;
  controls: Map<string, HTMLElement>;
  lastState: ReaderStateSnapshot | null;
  readonly onResize: () => void;

  constructor(onCollapsedChange: (collapsed: boolean) => void) {
    this.onCollapsedChange = onCollapsedChange;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.collapsed = true;
    this.actions = null;
    this.controls = new Map();
    this.lastState = null;
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

    this.controls.clear();
    this.lastState = null;
    const shell = document.createElement("div");
    shell.id = "au-reader-dock-shell";
    shell.className = "is-collapsed";
    shell.innerHTML = `
      <button id="au-reader-dock-handle" type="button" aria-label="${escapeHtml(t("dock.handleLabel"))}" title="${escapeHtml(t("dock.handleTitle"))}">
        <svg aria-hidden="true" viewBox="0 0 24 96" width="16" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="6" x2="6" y2="90"></line>
          <line x1="12" y1="6" x2="12" y2="90"></line>
          <line x1="18" y1="6" x2="18" y2="90"></line>
        </svg>
      </button>
      <aside id="au-reader-dock" aria-label="${escapeHtml(t("dock.controlsLabel"))}">
        <div class="au-dock-content">
          <div class="au-dock-header">
            <div class="au-dock-title">${escapeHtml(t("dock.title"))}</div>
            <div class="au-dock-header-actions">
              <div id="au-dock-page" class="au-dock-page" hidden>0 / 0</div>
              <div id="au-dock-progress" class="au-dock-progress">0%</div>
              <button id="au-dock-settings" class="au-dock-icon-btn" type="button" aria-label="${escapeHtml(t("dock.openSettings"))}" title="${escapeHtml(t("dock.settings"))}">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-section-label">${escapeHtml(t("dock.autoScroll"))}</div>
            <div class="au-dock-row">
              <span>${escapeHtml(t("dock.status"))}</span>
              <button id="au-dock-scroll-btn" class="au-dock-btn" type="button">${escapeHtml(t("dock.start"))}</button>
            </div>
            <div class="au-dock-row">
              <span>${escapeHtml(t("dock.speed"))}</span>
              <div class="au-dock-stepper">
                <button id="au-dock-speed-dec" class="au-dock-step" type="button">-</button>
                <input id="au-dock-speed-input" class="au-dock-num" type="number" step="0.1">
                <button id="au-dock-speed-inc" class="au-dock-step" type="button">+</button>
              </div>
            </div>
          </div>

          <div class="au-dock-section au-dock-layout-section">
            <div class="au-dock-section-label">${escapeHtml(t("dock.layout"))}</div>
            <div class="au-dock-row">
              <span>${escapeHtml(t("dock.fitWidth"))}</span>
              <button id="au-dock-fit-btn" class="au-dock-btn" type="button">${escapeHtml(t("dock.fitOff"))}</button>
            </div>
            <div class="au-dock-row">
              <span>${escapeHtml(t("dock.width"))}</span>
              <div class="au-dock-stepper">
                <button id="au-dock-width-dec" class="au-dock-step" type="button">-</button>
                <input id="au-dock-width-input" class="au-dock-num" type="number" step="1">
                <button id="au-dock-width-inc" class="au-dock-step" type="button">+</button>
              </div>
            </div>
            <div class="au-dock-row">
              <span>${escapeHtml(t("dock.brightness"))}</span>
              <div class="au-dock-stepper">
                <input id="au-dock-brightness" class="au-dock-range" type="range" min="40" max="100" step="5">
                <span id="au-dock-brightness-val" class="au-dock-range-val">100%</span>
              </div>
            </div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-section-label">${escapeHtml(t("dock.navigation"))}</div>
            <div class="au-dock-nav-grid">
              <button id="au-dock-prev" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.prev"))}</button>
              <button id="au-dock-next" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.next"))}</button>
              <button id="au-dock-series" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.series"))}</button>
              <button id="au-dock-top" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.top"))}</button>
              <button id="au-dock-page-prev" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.prevPage"))}</button>
              <button id="au-dock-page-next" class="au-dock-nav-btn" type="button">${escapeHtml(t("dock.nextPage"))}</button>
            </div>
          </div>

          <div class="au-dock-footer">
            ${escapeHtml(t("dock.footerKeys"))}<br>
            ${escapeHtml(t("dock.footerDoubleClick"))}
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
    const pagePrevBtn = byId("au-dock-page-prev");
    const pageNextBtn = byId("au-dock-page-next");
    const settingsBtn = byId("au-dock-settings");

    if (handle) handle.onclick = () => this.setCollapsed(!this.collapsed, true);
    if (settingsBtn) settingsBtn.onclick = () => actions.openSettings();
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
    if (pagePrevBtn) pagePrevBtn.onclick = () => { actions.jumpPage("prev"); mobileClose(); };
    if (pageNextBtn) pageNextBtn.onclick = () => { actions.jumpPage("next"); mobileClose(); };
    if (this.backdrop) this.backdrop.onclick = () => this.setCollapsed(true, true);
  }

  handleResize() {
    this.updateBackdropState();
  }

  setCollapsed(value: boolean, persist: boolean): void {
    const next = !!value;
    const changed = this.collapsed !== next;
    this.collapsed = next;
    if (this.shell) this.shell.classList.toggle("is-collapsed", this.collapsed);
    this.updateBackdropState();
    if (persist && changed && this.onCollapsedChange) {
      this.onCollapsedChange(this.collapsed);
    }
  }

  getControl<T extends HTMLElement = HTMLElement>(id: string): T | null {
    const cached = this.controls.get(id);
    if (cached?.isConnected) return cached as T;
    const control = this.shell?.querySelector<T>(`#${id}`) ?? null;
    if (control) this.controls.set(id, control);
    return control;
  }

  updateBackdropState() {
    if (!this.backdrop) return;
    const show = this.isMobile() && !this.collapsed;
    this.backdrop.classList.toggle("visible", show);
  }

  sync(state: ReaderStateSnapshot): void {
    if (!this.shell) return;
    const previous = this.lastState;

    const byId = <T extends HTMLElement = HTMLElement>(id: string) => this.getControl<T>(id);
    const progress = byId("au-dock-progress");
    const pageCounter = byId("au-dock-page");
    const scrollBtn = byId("au-dock-scroll-btn");
    const speedInput = byId<HTMLInputElement>("au-dock-speed-input");
    const widthInput = byId<HTMLInputElement>("au-dock-width-input");
    const fitBtn = byId("au-dock-fit-btn");
    const prevBtn = byId<HTMLButtonElement>("au-dock-prev");
    const nextBtn = byId<HTMLButtonElement>("au-dock-next");
    const seriesBtn = byId<HTMLButtonElement>("au-dock-series");
    const widthDec = byId<HTMLButtonElement>("au-dock-width-dec");
    const widthInc = byId<HTMLButtonElement>("au-dock-width-inc");

    if (progress && previous?.progress !== state.progress) {
      progress.textContent = formatPercent(state.progress);
    }
    if (
      pageCounter &&
      (previous?.page !== state.page || previous?.pageCount !== state.pageCount)
    ) {
      pageCounter.hidden = state.pageCount === 0;
      pageCounter.textContent = `${state.page} / ${state.pageCount}`;
    }
    if (scrollBtn && previous?.isScrolling !== state.isScrolling) {
      scrollBtn.textContent = state.isScrolling ? t("dock.stop") : t("dock.start");
      scrollBtn.classList.toggle("active", state.isScrolling);
    }
    if (speedInput && previous?.speed !== state.speed) speedInput.value = String(state.speed);
    if (widthInput && previous?.width !== state.width) widthInput.value = String(state.width);

    const brightness = byId<HTMLInputElement>("au-dock-brightness");
    const brightnessVal = byId("au-dock-brightness-val");
    if (
      brightness &&
      previous?.brightness !== state.brightness &&
      document.activeElement !== brightness
    ) {
      // Do not move the slider under the pointer while the user is dragging it.
      brightness.value = String(state.brightness);
    }
    if (brightnessVal && previous?.brightness !== state.brightness) {
      brightnessVal.textContent = formatPercent(state.brightness);
    }
    if (fitBtn && previous?.fitWidth !== state.fitWidth) {
      fitBtn.textContent = state.fitWidth ? t("dock.fitOn") : t("dock.fitOff");
      fitBtn.classList.toggle("active", state.fitWidth);
    }

    const widthDisabled = !!state.fitWidth;
    if (previous?.fitWidth !== state.fitWidth) {
      if (widthInput) widthInput.disabled = widthDisabled;
      if (widthDec) widthDec.disabled = widthDisabled;
      if (widthInc) widthInc.disabled = widthDisabled;
    }
    if (prevBtn && previous?.canPrev !== state.canPrev) prevBtn.disabled = !state.canPrev;
    if (nextBtn && previous?.canNext !== state.canNext) nextBtn.disabled = !state.canNext;
    if (seriesBtn && previous?.hasSeries !== state.hasSeries) seriesBtn.disabled = !state.hasSeries;
    if (previous?.isScrolling !== state.isScrolling) {
      this.shell.classList.toggle("is-scrolling", !!state.isScrolling);
    }
    this.lastState = { ...state };
  }

  unmount() {
    if (this.shell) this.shell.remove();
    if (this.backdrop) this.backdrop.remove();
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.actions = null;
    this.controls.clear();
    this.lastState = null;
    window.removeEventListener("resize", this.onResize);
  }
}
