import { CONSTANTS } from "../config/defaults.js";
import { bindingToLabel } from "../config/keybinds.js";
import type { KeybindKey } from "../config/keybinds.js";
import type { SettingsPageKey } from "../config/settingsLayout.js";
import type { ChapterDirection, ReaderStateSnapshot } from "../controllers/readerController.js";
import type { PageDirection } from "../controllers/pageNavLogic.js";
import { ConfigStore } from "../store/configStore.js";
import { formatPercent, t } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import {
  CHEVRON_LEFT_ICON,
  CHEVRON_RIGHT_ICON,
  CLEAR_ICON,
  GEAR_ICON,
  PAGE_ICONS,
  PAUSE_ICON,
  PLAY_ICON,
} from "./settingsIcons.js";

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
  openSettings(page: SettingsPageKey): void;
}

// A key name longer than this would crowd a half-width button, so it only appears in the tooltip.
const MAX_INLINE_KEY_LENGTH = 5;

// The accessible name is the full action; the visible text can stay short because the row label gives context.
function navButtonHTML(
  id: string,
  text: MessageKey,
  name: MessageKey,
  keybind: KeybindKey,
  direction?: "prev" | "next",
): string {
  return `
    <button id="${id}" class="au-dock-nav-btn" type="button" aria-label="${escapeHtml(t(name))}" data-au-name="${escapeHtml(t(name))}" data-au-keybind="${keybind}">
      ${direction === "prev" ? CHEVRON_LEFT_ICON : ""}
      <span class="au-dock-btn-text">${escapeHtml(t(text))}</span>
      ${direction === "next" ? CHEVRON_RIGHT_ICON : ""}
    </button>
  `;
}

interface StepperOptions {
  prefix: string;
  decrease: MessageKey;
  increase: MessageKey;
  step: string;
  // Explains the value's scale, for a number that means nothing on its own.
  hint?: MessageKey;
  keybinds?: readonly [decrease: KeybindKey, increase: KeybindKey];
}

function stepperHTML({ prefix, decrease, increase, step, hint, keybinds }: StepperOptions): string {
  const stepButton = (id: string, name: MessageKey, symbol: string, keybind?: KeybindKey) => `
    <button id="${id}" class="au-dock-step" type="button" aria-label="${escapeHtml(t(name))}" title="${escapeHtml(t(name))}" data-au-name="${escapeHtml(t(name))}" ${keybind ? `data-au-keybind="${keybind}" data-au-no-inline-key` : ""}>${symbol}</button>
  `;
  return `
    <div class="au-dock-stepper">
      ${stepButton(`au-dock-${prefix}-dec`, decrease, "&minus;", keybinds?.[0])}
      <input id="au-dock-${prefix}-input" class="au-dock-num" type="number" step="${step}" ${hint ? `title="${escapeHtml(t(hint))}"` : ""}>
      ${stepButton(`au-dock-${prefix}-inc`, increase, "+", keybinds?.[1])}
    </div>
  `;
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
      <button id="au-reader-dock-handle" type="button" aria-label="${escapeHtml(t("dock.title"))}" aria-expanded="false" aria-controls="au-reader-dock" data-au-name="${escapeHtml(t("dock.title"))}" data-au-keybind="keybindToggleDock" data-au-no-inline-key>
        ${CHEVRON_LEFT_ICON}
      </button>
      <aside id="au-reader-dock" aria-label="${escapeHtml(t("dock.controlsLabel"))}">
        <div class="au-dock-content">
          <div class="au-dock-header">
            <div class="au-dock-title">${escapeHtml(t("dock.title"))}</div>
            <div class="au-dock-header-actions">
              <div class="au-dock-stats">
                <span id="au-dock-page" class="au-dock-page" hidden>0 / 0</span>
                <span id="au-dock-progress" class="au-dock-progress">0%</span>
              </div>
              <button id="au-dock-settings" class="au-dock-icon-btn" type="button" aria-label="${escapeHtml(t("dock.openSettings"))}" title="${escapeHtml(t("dock.settings"))}">${GEAR_ICON}</button>
              <button id="au-dock-close" class="au-dock-icon-btn" type="button" aria-label="${escapeHtml(t("dock.close"))}">${CLEAR_ICON}</button>
            </div>
          </div>

          <div class="au-dock-section">
            <button id="au-dock-scroll-btn" class="au-dock-primary" type="button" data-au-keybind="keybindToggleScroll">
              <span id="au-dock-scroll-icon" class="au-dock-primary-icon">${PLAY_ICON}</span>
              <span id="au-dock-scroll-text" class="au-dock-btn-text">${escapeHtml(t("dock.autoScrollStart"))}</span>
            </button>
            <div class="au-dock-row">
              <label for="au-dock-speed-input">${escapeHtml(t("dock.speed"))}</label>
              ${stepperHTML({
                prefix: "speed",
                decrease: "dock.speedDown",
                increase: "dock.speedUp",
                step: "0.1",
                hint: "setting.autoScrollSpeed.tooltip",
                keybinds: ["keybindSpeedDown", "keybindSpeedUp"],
              })}
            </div>
          </div>

          <div class="au-dock-section">
            <div class="au-dock-nav-row">
              <span class="au-dock-nav-label">${escapeHtml(t("dock.chapter"))}</span>
              ${navButtonHTML("au-dock-prev", "dock.prev", "dock.prevChapter", "keybindPrevChapter", "prev")}
              ${navButtonHTML("au-dock-next", "dock.next", "dock.nextChapter", "keybindNextChapter", "next")}
            </div>
            <div class="au-dock-nav-row au-dock-page-row">
              <span class="au-dock-nav-label">${escapeHtml(t("dock.page"))}</span>
              ${navButtonHTML("au-dock-page-prev", "dock.prev", "dock.prevPage", "keybindPrevPage", "prev")}
              ${navButtonHTML("au-dock-page-next", "dock.next", "dock.nextPage", "keybindNextPage", "next")}
            </div>
            <div class="au-dock-nav-row">
              <span class="au-dock-nav-label">${escapeHtml(t("dock.goTo"))}</span>
              ${navButtonHTML("au-dock-series", "dock.series", "dock.seriesLabel", "keybindGoSeries")}
              <button id="au-dock-top" class="au-dock-nav-btn" type="button" aria-label="${escapeHtml(t("dock.topLabel"))}">
                <span class="au-dock-btn-text">${escapeHtml(t("dock.top"))}</span>
              </button>
            </div>
          </div>

          <div class="au-dock-section au-dock-layout-section">
            <button id="au-dock-fit-btn" class="au-dock-switch-row" type="button" role="switch" aria-checked="false" data-au-keybind="keybindToggleFitWidth">
              <span class="au-dock-btn-text">${escapeHtml(t("dock.fitWidth"))}</span>
              <span class="au-dock-switch" aria-hidden="true"></span>
            </button>
            <div id="au-dock-width-row" class="au-dock-row">
              <label for="au-dock-width-input">${escapeHtml(t("dock.width"))}</label>
              ${stepperHTML({ prefix: "width", decrease: "dock.widthDown", increase: "dock.widthUp", step: "1" })}
            </div>
            <div class="au-dock-row">
              <label for="au-dock-brightness">${escapeHtml(t("dock.brightness"))}</label>
              <div class="au-dock-range-wrap">
                <input id="au-dock-brightness" class="au-dock-range" type="range" min="40" max="100" step="5">
                <span id="au-dock-brightness-val" class="au-dock-range-val">100%</span>
              </div>
            </div>
          </div>

          <div class="au-dock-footer">
            <span id="au-dock-doubleclick-tip">${escapeHtml(t("dock.doubleClickTip"))}</span>
            <button id="au-dock-shortcuts" class="au-dock-link" type="button">${PAGE_ICONS.shortcuts}${escapeHtml(t("dock.allShortcuts"))}</button>
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
    this.syncShortcuts();
    this.setCollapsed(this.collapsed, false);
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  bindEvents() {
    if (!this.shell || !this.actions) return;
    const actions = this.actions;

    const byId = <T extends HTMLElement = HTMLElement>(id: string) => this.shell!.querySelector<T>(`#${id}`);
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
    const shortcutsBtn = byId("au-dock-shortcuts");
    const closeBtn = byId("au-dock-close");
    const handle = byId("au-reader-dock-handle");

    if (handle) handle.onclick = () => this.toggle();
    if (closeBtn) closeBtn.onclick = () => this.toggle();
    if (settingsBtn) settingsBtn.onclick = () => actions.openSettings("reader");
    if (shortcutsBtn) shortcutsBtn.onclick = () => actions.openSettings("shortcuts");
    const mobileClose = () => {
      if (this.isMobile()) this.setCollapsed(true, true);
    };
    if (scrollBtn) {
      scrollBtn.onclick = () => {
        actions.toggleScroll();
        // The sheet covers most of a phone screen, and the page is what the reader now wants to see.
        mobileClose();
      };
    }
    if (speedDec) speedDec.onclick = () => actions.stepSpeed(-CONSTANTS.SPEED_STEP);
    if (speedInc) speedInc.onclick = () => actions.stepSpeed(CONSTANTS.SPEED_STEP);

    // Typing must not reach the site's key handlers, but Esc still has to close the dock.
    const keepTypingLocal = (e: KeyboardEvent) => {
      if (e.key !== "Escape") e.stopPropagation();
    };

    if (speedInput) {
      speedInput.onkeydown = keepTypingLocal;
      // Written back here because sync skips an unchanged value, which would leave an out-of-range entry showing.
      speedInput.onchange = () => {
        speedInput.value = String(actions.setSpeed(speedInput.value));
      };
    }

    if (widthDec) widthDec.onclick = () => actions.stepWidth(-100);
    if (widthInc) widthInc.onclick = () => actions.stepWidth(100);
    if (widthInput) {
      widthInput.onkeydown = keepTypingLocal;
      widthInput.onchange = () => {
        widthInput.value = String(actions.setWidth(widthInput.value));
      };
    }
    if (fitBtn) fitBtn.onclick = () => actions.toggleFitWidth();

    const brightness = byId<HTMLInputElement>("au-dock-brightness");
    if (brightness) {
      brightness.onkeydown = keepTypingLocal;
      brightness.oninput = (e) => actions.setBrightness((e.currentTarget as HTMLInputElement).value);
    }

    if (prevBtn) prevBtn.onclick = () => { actions.navigate("prev"); mobileClose(); };
    if (nextBtn) nextBtn.onclick = () => { actions.navigate("next"); mobileClose(); };
    if (seriesBtn) seriesBtn.onclick = () => { actions.goSeries(); mobileClose(); };
    if (topBtn) topBtn.onclick = () => { actions.goTop(); mobileClose(); };
    if (pagePrevBtn) pagePrevBtn.onclick = () => { actions.jumpPage("prev"); mobileClose(); };
    if (pageNextBtn) pageNextBtn.onclick = () => { actions.jumpPage("next"); mobileClose(); };
    if (this.backdrop) this.backdrop.onclick = () => this.setCollapsed(true, true);

    this.shell.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || this.collapsed) return;
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });
  }

  handleResize() {
    this.updateBackdropState();
  }

  toggle(): void {
    this.setCollapsed(!this.collapsed, true);
    if (this.collapsed) return;
    if (this.isMobile()) {
      // The sheet covers the handle on a phone, so focus moves to the control that closes it.
      this.getControl("au-dock-close")?.focus({ preventScroll: true });
    } else if (document.activeElement === document.body) {
      // Opened by shortcut: the panel comes last in the page, so the next Tab starts from its handle.
      this.getControl("au-reader-dock-handle")?.focus({ preventScroll: true });
    }
  }

  setCollapsed(value: boolean, persist: boolean): void {
    const next = !!value;
    const changed = this.collapsed !== next;
    // Every way of closing passes through here, so none can strand focus on a control that just went inert.
    const focusWasInside = next && !!this.panel?.contains(document.activeElement);
    this.collapsed = next;
    if (this.shell) this.shell.classList.toggle("is-collapsed", this.collapsed);
    // A collapsed panel is only visually hidden, so inert keeps its controls out of the tab order.
    if (this.panel) this.panel.inert = this.collapsed;
    const handle = this.getControl("au-reader-dock-handle");
    handle?.setAttribute("aria-expanded", this.collapsed ? "false" : "true");
    if (focusWasInside) handle?.focus({ preventScroll: true });
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

  // Key hints come from the live bindings, so rebinding a shortcut updates every label that shows it.
  syncShortcuts(): void {
    if (!this.shell) return;
    this.shell.querySelectorAll<HTMLElement>("[data-au-keybind]").forEach((button) => {
      const binding = ConfigStore.get(button.getAttribute("data-au-keybind") as KeybindKey);
      const label = binding ? bindingToLabel(binding) : "";
      const name = button.getAttribute("data-au-name") ?? button.textContent?.trim() ?? "";
      button.title = label ? `${name} (${label})` : name;
      const showInline =
        !!label && label.length <= MAX_INLINE_KEY_LENGTH && !button.hasAttribute("data-au-no-inline-key");
      if (showInline) button.setAttribute("data-au-key", label);
      else button.removeAttribute("data-au-key");
    });

    const tip = this.getControl("au-dock-doubleclick-tip");
    if (tip) tip.hidden = !ConfigStore.get("doubleClickScroll");
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
      const text = byId("au-dock-scroll-text");
      const icon = byId("au-dock-scroll-icon");
      if (text) text.textContent = state.isScrolling ? t("dock.autoScrollStop") : t("dock.autoScrollStart");
      if (icon) icon.innerHTML = state.isScrolling ? PAUSE_ICON : PLAY_ICON;
      scrollBtn.classList.toggle("active", state.isScrolling);
      this.shell.classList.toggle("is-scrolling", state.isScrolling);
      this.syncShortcuts();
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
    if (previous?.fitWidth !== state.fitWidth) {
      fitBtn?.setAttribute("aria-checked", state.fitWidth ? "true" : "false");
      if (widthInput) widthInput.disabled = state.fitWidth;
      if (widthDec) widthDec.disabled = state.fitWidth;
      if (widthInc) widthInc.disabled = state.fitWidth;
      byId("au-dock-width-row")?.classList.toggle("is-disabled", state.fitWidth);
    }
    if (prevBtn && previous?.canPrev !== state.canPrev) prevBtn.disabled = !state.canPrev;
    if (nextBtn && previous?.canNext !== state.canNext) nextBtn.disabled = !state.canNext;
    if (seriesBtn && previous?.hasSeries !== state.hasSeries) seriesBtn.disabled = !state.hasSeries;
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
