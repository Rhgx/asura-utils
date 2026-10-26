import {
  appearanceModalSection,
  languageModalSelect,
  readerModalSection,
} from "../config/modalSections.js";
import type { ModalSection } from "../config/modalSections.js";
import {
  KEYBIND_FIELDS,
  normalizeEventToBinding,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import {
  COMPLETED_THRESHOLD,
  HistoryStore,
  chapterSlugToLabel,
  formatHistoryAge,
} from "../store/historyStore.js";
import { FilterStore } from "../store/filterStore.js";
import { DEFAULTS, isConfigKey } from "../config/defaults.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import packageJson from "../../package.json";
import {
  renderShortcutsEditor,
  setShortcutListeningState,
} from "./settingsShortcuts.js";
import { formatPercent, t, tPlural } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";

const APP_VERSION = packageJson.version;

// Catalog keys for setting tooltips. Settings without an entry show no tooltip.
const SETTING_TOOLTIP_KEYS: Partial<Record<ConfigKey, MessageKey>> = {
  adBlock: "setting.adBlock.tooltip",
  colorTimestamps: "setting.colorTimestamps.tooltip",
  hideSlider: "setting.hideSlider.tooltip",
  hideToraka: "setting.hideToraka.tooltip",
  hideComments: "setting.hideComments.tooltip",
  hideDefaultBackToTop: "setting.hideDefaultBackToTop.tooltip",
  showNewChapterBadges: "setting.showNewChapterBadges.tooltip",
  seriesFilters: "setting.seriesFilters.tooltip",
  compactSidebar: "setting.compactSidebar.tooltip",
  hidePopularSection: "setting.hidePopularSection.tooltip",
  hideAnnouncements: "setting.hideAnnouncements.tooltip",
  hideNovelPromos: "setting.hideNovelPromos.tooltip",
  hideReactions: "setting.hideReactions.tooltip",
  menuSeriesOverhaul: "setting.menuSeriesOverhaul.tooltip",
  themePreset: "setting.themePreset.tooltip",
  readerWidget: "setting.readerWidget.tooltip",
  hideNativeReaderControls: "setting.hideNativeReaderControls.tooltip",
  showProgressBar: "setting.showProgressBar.tooltip",
  fitWidthMode: "setting.fitWidthMode.tooltip",
  doubleClickScroll: "setting.doubleClickScroll.tooltip",
  hasPremiumAccess: "setting.hasPremiumAccess.tooltip",
  chapterEndAction: "setting.chapterEndAction.tooltip",
  imageWidth: "setting.imageWidth.tooltip",
  autoScrollSpeed: "setting.autoScrollSpeed.tooltip",
  trackReadingHistory: "setting.trackReadingHistory.tooltip",
  resumeChapterPosition: "setting.resumeChapterPosition.tooltip",
  customAccentEnabled: "setting.customAccentEnabled.tooltip",
  customAccent: "setting.customAccent.tooltip",
  readerBrightness: "setting.readerBrightness.tooltip",
  language: "setting.language.tooltip",
};

function tooltipFor(key: ConfigKey): string {
  const messageKey = SETTING_TOOLTIP_KEYS[key];
  return messageKey ? t(messageKey) : "";
}

export class SettingsModalView {
  readonly onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void;
  modalOpen: boolean;
  activeTabKey: string;
  modalCleanup: (() => void) | null;

  constructor(onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void) {
    this.onConfigChanged = onConfigChanged;
    this.modalOpen = false;
    this.activeTabKey = "general";
    this.modalCleanup = null;
  }

  createHeaderButton() {
    const insertionTarget = this.findHeaderButtonTarget();
    if (!insertionTarget || !insertionTarget.parentNode) return;

    let btn = document.getElementById("au-settings-btn-main");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "au-settings-btn-main";
      btn.className = "au-settings-btn";
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      btn.onclick = (e) => {
        e.preventDefault();
        this.toggleModal();
      };
    }

    if (btn.parentNode !== insertionTarget.parentNode) {
      insertionTarget.parentNode.insertBefore(btn, insertionTarget);
    } else if (btn.nextSibling !== insertionTarget) {
      insertionTarget.parentNode.insertBefore(btn, insertionTarget);
    }
  }

  findHeaderButtonTarget(): Element | null {
    // The user menu island is in the header for both signed-in and signed-out visitors.
    // Signed-in profile links only exist inside its closed dropdown, so they cannot anchor the button.
    const userMenu = document.querySelector('header astro-island[component-url*="UserMenu"]');
    if (userMenu) {
      // Insert beside the wrapper that sits in the header's flex row; inside a block wrapper the button stacks above the row.
      let target: Element = userMenu;
      while (
        target.parentElement &&
        target.parentElement.tagName !== "HEADER" &&
        window.getComputedStyle(target.parentElement).display !== "flex"
      ) {
        target = target.parentElement;
      }
      return target;
    }

    const profileLinks = document.querySelectorAll<HTMLElement>(
      'header a[href*="/login"], header a[href*="/dashboard"], header a[href*="/account"], header a[href*="/user/"]'
    );
    if (profileLinks.length === 0) return null;

    const targetAnchor =
      Array.from(profileLinks).find((el) => el.offsetParent !== null) ||
      profileLinks[0]!;
    return (
      targetAnchor.closest(".mobile-menu-hide") ||
      targetAnchor.closest(".profile-menu-hide") ||
      targetAnchor.closest("astro-island") ||
      targetAnchor
    );
  }

  toggleModal() {
    const existing = document.getElementById("au-modal-overlay");
    if (existing) {
      if (typeof this.modalCleanup === "function") {
        this.modalCleanup();
      } else {
        existing.remove();
        this.modalOpen = false;
      }
    } else {
      this.renderModal();
      this.modalOpen = true;
    }
  }

  renderModal() {
    const cfg = ConfigStore.getAll();
    const overlay = document.createElement("div");
    overlay.id = "au-modal-overlay";

    const sections: ModalSection[] = [
      {
        key: "general",
        title: t("tab.general"),
        // Language is the first control on General, so it sits above the toggles.
        selectsFirst: true,
        selects: [languageModalSelect()],
        toggles: [
          ["adBlock", t("setting.adBlock.label")],
          ["colorTimestamps", t("setting.colorTimestamps.label")],
          ["hideSlider", t("setting.hideSlider.label")],
          ["hideToraka", t("setting.hideToraka.label")],
          ["hideComments", t("setting.hideComments.label")],
          ["hideDefaultBackToTop", t("setting.hideDefaultBackToTop.label")],
          ["showNewChapterBadges", t("setting.showNewChapterBadges.label")],
        ],
      },
      {
        key: "layout",
        title: t("tab.layout"),
        toggles: [
          ["compactSidebar", t("setting.compactSidebar.label")],
          ["hidePopularSection", t("setting.hidePopularSection.label")],
          ["hideAnnouncements", t("setting.hideAnnouncements.label")],
          ["hideNovelPromos", t("setting.hideNovelPromos.label")],
          ["hideReactions", t("setting.hideReactions.label")],
          ["menuSeriesOverhaul", t("setting.menuSeriesOverhaul.label")],
          ["seriesFilters", t("setting.seriesFilters.label")],
        ],
      },
      {
        key: "filters",
        title: t("tab.filters"),
        render: () => `<div data-au-filters>${this.filtersBodyHTML()}</div>`,
      },
      { ...appearanceModalSection(), key: "appearance" },
      { ...readerModalSection(), key: "reader" },
      {
        key: "shortcuts",
        title: t("tab.shortcuts"),
        render: () => renderShortcutsEditor(cfg),
      },
      {
        key: "history",
        title: t("tab.history"),
        render: () => `<div data-au-history>${this.historyBodyHTML()}</div>`,
      },
      {
        key: "data",
        title: t("tab.data"),
        render: () => this.dataSectionHTML(),
      },
    ];

    const availableTabKeys = sections
      .map((section) => section.key)
      .filter(Boolean);
    const initialTabKey = availableTabKeys.includes(this.activeTabKey)
      ? this.activeTabKey
      : availableTabKeys[0];

    const tabButtonsHtml = sections
      .map((section) => {
        const isActive = section.key === initialTabKey;
        return `
          <button
            type="button"
            class="au-tab-btn ${isActive ? "active" : ""}"
            data-tab="${section.key}"
            role="tab"
            aria-selected="${isActive ? "true" : "false"}"
          >
            ${escapeHtml(section.title)}
          </button>
        `;
      })
      .join("");

    const sectionHtml = sections
      .map((section) => {
        const isActive = section.key === initialTabKey;
        const toggles = (section.toggles || [])
          .map(([key, label]) =>
            this.toggleHTML(
              key,
              label,
              cfg[key],
              tooltipFor(key)
            )
          )
          .join("");

        const inputs = (section.inputs || [])
          .map((input) => {
            const isDisabled =
              (input.key === "imageWidth" && !!cfg.fitWidthMode) ||
              (input.key === "customAccent" && !cfg.customAccentEnabled);
            const tooltip = input.tooltip || tooltipFor(input.key);
            const inputClass =
              input.type === "color" ? "au-input-color" : "au-input-num";
            return `
              <div class="au-control-row">
                ${this.controlLabelHTML(input.label, tooltip)}
                <input
                  type="${input.type}"
                  id="${input.id}"
                  class="${inputClass}"
                  data-key="${input.key}"
                  step="${input.step || "1"}"
                  value="${cfg[input.key]}"
                  ${isDisabled ? 'disabled style="opacity:0.5"' : ""}
                >
              </div>
            `;
          })
          .join("");

        const selects = (section.selects || [])
          .map((select) => {
            const options = (select.options || [])
              .map((opt) => {
                const value = typeof opt === "string" ? opt : opt.value;
                const label = typeof opt === "string" ? opt : opt.label;
                const selected = String(cfg[select.key]) === String(value);
                return `<option value="${value}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
              })
              .join("");
            const tooltip = select.tooltip || tooltipFor(select.key);

            return `
              <div class="au-control-row">
                ${this.controlLabelHTML(select.label, tooltip)}
                <select id="${select.id}" class="au-input-select" data-key="${select.key}">
                  ${options}
                </select>
              </div>
            `;
          })
          .join("");

        const staticHtml =
          typeof section.render === "function"
            ? section.render()
            : section.html || "";

        return `
          <div
            class="au-section au-tab-panel ${isActive ? "active" : ""}"
            data-tab-panel="${section.key}"
            role="tabpanel"
          >
            <div class="au-section-title">${escapeHtml(section.title)}</div>
            ${section.selectsFirst ? `${selects}${toggles}` : `${toggles}${selects}`}
            ${inputs}
            ${staticHtml}
          </div>
        `;
      })
      .join("");

    overlay.innerHTML = `
      <div id="au-modal">
        <div class="au-modal-header">
          <span class="au-modal-title">${escapeHtml(t("settings.title"))}</span>
          <button type="button" class="au-close-btn" aria-label="${escapeHtml(t("settings.close"))}">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <div class="au-tab-bar" role="tablist">
          ${tabButtonsHtml}
        </div>
        <div class="au-tab-panels">
          ${sectionHtml}
        </div>
        <div class="au-modal-signature">${escapeHtml(t("settings.madeBy", { author: "Rocks" }))} &bull; v${APP_VERSION}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    let resizeHandler: (() => void) | null = null;
    let listeningShortcutKey = "";
    let isClosing = false;
    let closeTimer = 0;
    const keybindFieldMap = new Map(KEYBIND_FIELDS.map((field) => [field.key, field]));

    const finalizeClose = () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      overlay.remove();
      this.modalCleanup = null;
      this.modalOpen = false;
    };

    const close = () => {
      if (isClosing) return;
      isClosing = true;

      setShortcutListeningState(overlay, listeningShortcutKey, false);
      listeningShortcutKey = "";
      document.removeEventListener("keydown", captureShortcutKeydown, true);
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
      }

      overlay.classList.add("au-closing");
      closeTimer = window.setTimeout(finalizeClose, 180);
    };
    this.modalCleanup = close;

    const closeBtn = overlay.querySelector<HTMLButtonElement>(".au-close-btn");
    if (closeBtn) closeBtn.onclick = close;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const tabButtons = Array.from(overlay.querySelectorAll<HTMLButtonElement>(".au-tab-btn"));
    const tabPanels = Array.from(overlay.querySelectorAll<HTMLElement>(".au-tab-panel"));
    const panelsWrap = overlay.querySelector<HTMLElement>(".au-tab-panels");

    const syncPanelMinHeight = () => {
      if (!panelsWrap || tabPanels.length === 0) return;
      const wrapWidth = panelsWrap.clientWidth || 1;
      let maxHeight = 0;

      // Measure every tab at the current width, including hidden tabs, so the
      // modal does not jump in height when the user changes tabs.
      tabPanels.forEach((panel) => {
        const previousStyle = panel.getAttribute("style");

        panel.style.display = "block";
        panel.style.position = "absolute";
        panel.style.visibility = "hidden";
        panel.style.pointerEvents = "none";
        panel.style.left = "0";
        panel.style.top = "0";
        panel.style.width = `${wrapWidth}px`;

        maxHeight = Math.max(maxHeight, panel.scrollHeight);

        if (previousStyle === null) {
          panel.removeAttribute("style");
        } else {
          panel.setAttribute("style", previousStyle);
        }
      });

      if (maxHeight > 0) {
        panelsWrap.style.minHeight = `${Math.ceil(maxHeight)}px`;
      }
    };
    const startShortcutCapture = (fieldKey: string | null) => {
      if (!fieldKey) return;
      if (listeningShortcutKey && listeningShortcutKey !== fieldKey) {
        setShortcutListeningState(overlay, listeningShortcutKey, false);
      }
      if (listeningShortcutKey === fieldKey) {
        setShortcutListeningState(overlay, fieldKey, false);
        listeningShortcutKey = "";
        return;
      }
      listeningShortcutKey = fieldKey;
      setShortcutListeningState(overlay, fieldKey, true, t("shortcuts.pressKey"));
    };

    const captureShortcutKeydown = (event: KeyboardEvent) => {
      if (!listeningShortcutKey) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setShortcutListeningState(overlay, listeningShortcutKey, false);
        listeningShortcutKey = "";
        return;
      }

      const isClearKey = event.key === "Backspace" || event.key === "Delete";
      const binding = isClearKey ? "" : normalizeEventToBinding(event);
      if (!isClearKey && !binding) return;

      if (!isConfigKey(listeningShortcutKey)) return;
      const value = ConfigStore.set(listeningShortcutKey, binding);
      this.onConfigChanged(listeningShortcutKey, value);
      setShortcutListeningState(overlay, listeningShortcutKey, false);
      listeningShortcutKey = "";
    };

    const setActiveTab = (tabKey: string | null | undefined) => {
      if (!tabKey) return;
      this.activeTabKey = tabKey;

      tabButtons.forEach((btn) => {
        const isActive = btn.getAttribute("data-tab") === tabKey;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      tabPanels.forEach((panel) => {
        const isActive = panel.getAttribute("data-tab-panel") === tabKey;
        panel.classList.toggle("active", isActive);
      });
    };

    tabButtons.forEach((btn) => {
      btn.onclick = () => setActiveTab(btn.getAttribute("data-tab"));
    });
    setActiveTab(initialTabKey);
    syncPanelMinHeight();

    resizeHandler = () => syncPanelMinHeight();
    window.addEventListener("resize", resizeHandler, { passive: true });
    document.addEventListener("keydown", captureShortcutKeydown, true);

    overlay.querySelectorAll<HTMLInputElement>(".au-toggle input").forEach((input) => {
      input.onchange = (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const key = target.getAttribute("data-key");
        if (!isConfigKey(key)) return;
        const value = target.checked;
        ConfigStore.set(key, value);
        this.onConfigChanged(key, value);

          if (key === "fitWidthMode") {
            const widthInput = overlay.querySelector<HTMLInputElement>("#inp-imageWidth");
            if (widthInput) {
              widthInput.disabled = value;
              widthInput.style.opacity = value ? "0.5" : "1";
            }
          }

          if (key === "customAccentEnabled") {
            const accentInput = overlay.querySelector<HTMLInputElement>("#inp-customAccent");
            if (accentInput) {
              accentInput.disabled = !value;
              accentInput.style.opacity = value ? "1" : "0.5";
            }
          }

          syncPanelMinHeight();
        };
      });

    overlay.querySelectorAll<HTMLButtonElement>("[data-au-action]").forEach((button) => {
      button.onclick = () =>
        this.handleDataAction(button.getAttribute("data-au-action"), button);
    });
    // The filter list is re-rendered in place, so these listeners sit on its stable container.
    const filtersPanel = overlay.querySelector<HTMLElement>("[data-au-filters]");
    filtersPanel?.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const path = target?.closest("[data-au-unhide]")?.getAttribute("data-au-unhide");
      if (!path) return;
      FilterStore.unhideSeries(path);
      this.onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
      if (filtersPanel) filtersPanel.innerHTML = this.filtersBodyHTML();
      syncPanelMinHeight();
    });
    filtersPanel?.addEventListener("change", (e) => {
      // Checkbox state already matches the stored list, so the genre list is not re-rendered.
      const target = e.target instanceof HTMLInputElement ? e.target : null;
      const name = target?.getAttribute("data-au-genre");
      if (!target || !name) return;
      FilterStore.setGenreExcluded(name, target.checked);
      this.onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
    });

    // Same pattern as the filter list: re-rendered in place (import, clear), so listeners sit on the stable container.
    const historyPanel = overlay.querySelector<HTMLElement>("[data-au-history]");
    const syncHistoryList = () => {
      if (!historyPanel) return;
      const query = (historyPanel.querySelector<HTMLInputElement>("[data-au-history-search]")?.value ?? "")
        .trim()
        .toLowerCase();
      const rows = historyPanel.querySelectorAll<HTMLElement>(".au-history-item");
      let matches = 0;
      rows.forEach((row) => {
        const isMatch = (row.getAttribute("data-au-history-title") ?? "").includes(query);
        row.hidden = !isMatch;
        if (isMatch) matches++;
      });
      const note = historyPanel.querySelector<HTMLElement>("[data-au-history-note]");
      if (!note) return;
      note.textContent =
        rows.length === 0
          ? t("history.empty")
          : matches === 0
            ? t("history.noMatches")
            : "";
      note.hidden = note.textContent === "";
    };
    historyPanel?.addEventListener("input", syncHistoryList);
    historyPanel?.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest("[data-au-history-remove]") ?? null;
      const key = button?.getAttribute("data-au-history-remove");
      if (!button || !key) return;
      HistoryStore.remove(key);
      button.closest(".au-history-item")?.remove();
      syncHistoryList();
      this.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
    });

    overlay.querySelectorAll<HTMLButtonElement>("[data-shortcut-capture]").forEach((button) => {
      button.onclick = () => {
        startShortcutCapture(button.getAttribute("data-shortcut-capture"));
      };
    });

    overlay.querySelectorAll<HTMLButtonElement>("[data-shortcut-reset]").forEach((button) => {
      button.onclick = () => {
        const key = button.getAttribute("data-shortcut-reset");
        if (!isConfigKey(key)) return;
        const field = keybindFieldMap.get(key as typeof KEYBIND_FIELDS[number]["key"]);
        if (!field) return;
        const value = ConfigStore.set(key, field.defaultBinding);
        this.onConfigChanged(key, value);
        setShortcutListeningState(overlay, key, false);
        if (listeningShortcutKey === key) listeningShortcutKey = "";
      };
    });

    overlay.querySelectorAll<HTMLInputElement>(".au-input-num[data-key]").forEach((input) => {
      input.onchange = (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const key = target.getAttribute("data-key");
        if (!isConfigKey(key)) return;
        const value = ConfigStore.set(key, target.value);
        target.value = String(value);
        this.onConfigChanged(key, value);
      };
    });

    overlay.querySelectorAll<HTMLInputElement>(".au-input-color[data-key]").forEach((input) => {
      // "input" fires while the picker is open, giving a live preview.
      input.oninput = (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const key = target.getAttribute("data-key");
        if (!isConfigKey(key)) return;
        const value = ConfigStore.set(key, target.value);
        this.onConfigChanged(key, value);
      };
    });

    overlay.querySelectorAll<HTMLSelectElement>(".au-input-select[data-key]").forEach((select) => {
      select.onchange = (e) => {
        const target = e.currentTarget as HTMLSelectElement;
        const key = target.getAttribute("data-key");
        if (!isConfigKey(key)) return;
        const value = ConfigStore.set(key, target.value);
        target.value = String(value);
        this.onConfigChanged(key, value);
        // A language change rewrites every label in the modal, so it is rendered again in place.
        if (key === "language") this.reopenModal();
      };
    });
  }

  controlLabelHTML(label: string, tooltip: string): string {
    const safeLabel = escapeHtml(label);
    if (!tooltip) return `<span>${safeLabel}</span>`;
    const safeTip = escapeHtml(tooltip);
    return `
      <span class="au-control-label" data-tooltip="${safeTip}">
        <span>${safeLabel}</span>
        <span class="au-control-tooltip" aria-hidden="true">?</span>
      </span>
    `;
  }

  toggleHTML(key: ConfigKey, label: string, checked: AppConfig[ConfigKey], tooltip = ""): string {
    return `
      <div class="au-control-row">
        ${this.controlLabelHTML(label, tooltip)}
        <label class="au-toggle">
          <input type="checkbox" data-key="${key}" ${checked ? "checked" : ""}>
          <span class="au-slider"></span>
        </label>
      </div>
    `;
  }

  dataSectionHTML(): string {
    return `
      <div class="au-data-note">
        ${escapeHtml(t("data.note"))}
      </div>
      <div class="au-data-actions">
        <button type="button" class="au-data-btn" data-au-action="export">${escapeHtml(t("data.exportSettings"))}</button>
        <button type="button" class="au-data-btn" data-au-action="import">${escapeHtml(t("data.importSettings"))}</button>
        <button type="button" class="au-data-btn" data-au-action="export-history">${escapeHtml(t("data.exportHistory"))}</button>
        <button type="button" class="au-data-btn" data-au-action="import-history">${escapeHtml(t("data.importHistory"))}</button>
        <button type="button" class="au-data-btn" data-au-action="reset">${escapeHtml(t("data.reset"))}</button>
        <button type="button" class="au-data-btn au-data-btn-danger" data-au-action="clear-history">${escapeHtml(t("data.clearHistory"))}</button>
      </div>
    `;
  }

  historyBodyHTML(): string {
    const now = Date.now();
    const entries = Object.entries(HistoryStore.load()).sort(
      ([, a], [, b]) => b.lastTs - a.lastTs
    );
    const rowsHTML = entries
      .map(([key, entry]) => {
        const title = entry.title || key;
        const progress = entry.lastProgress >= COMPLETED_THRESHOLD ? t("history.finished") : formatPercent(entry.lastProgress);
        const meta = [chapterSlugToLabel(entry.lastChapter), progress, formatHistoryAge(entry.lastTs, now)]
          .filter(Boolean)
          .map((part) => escapeHtml(part))
          .join(" &bull; ");
        return `
          <li class="au-history-item" data-au-history-title="${escapeHtml(title.toLowerCase())}">
            <div class="au-history-info">
              <div class="au-history-title-row">
                <a class="au-history-title" href="${escapeHtml(entry.lastHref)}">${escapeHtml(title)}</a>
                ${key.startsWith("novel:") ? `<span class="au-history-tag">${escapeHtml(t("history.novelTag"))}</span>` : ""}
              </div>
              <div class="au-history-meta">
                <span>${meta}</span>
                <span>${escapeHtml(tPlural("history.readCount", entry.read.length))}</span>
              </div>
            </div>
            <button type="button" class="au-data-btn" data-au-history-remove="${escapeHtml(key)}">${escapeHtml(t("history.remove"))}</button>
          </li>
        `;
      })
      .join("");

    return `
      <input type="search" class="au-history-search" placeholder="${escapeHtml(t("history.search"))}" aria-label="${escapeHtml(t("history.searchLabel"))}" data-au-history-search>
      <div class="au-data-note" data-au-history-note ${entries.length === 0 ? "" : "hidden"}>${escapeHtml(t("history.empty"))}</div>
      <ul class="au-history-list">${rowsHTML}</ul>
    `;
  }

  refreshHistoryPanel(): void {
    const panel = document.querySelector<HTMLElement>("#au-modal [data-au-history]");
    if (panel) panel.innerHTML = this.historyBodyHTML();
  }

  filtersBodyHTML(): string {
    const hidden = FilterStore.listHidden();
    const excluded = new Set(FilterStore.listExcludedGenres().map((name) => name.toLowerCase()));
    const genres = FilterStore.listGenreNames().sort((a, b) => a.localeCompare(b));

    const hiddenHTML =
      hidden.length === 0
        ? `<div class="au-data-note">${escapeHtml(t("filters.noHidden"))}</div>`
        : `<ul class="au-filter-list">${hidden
            .map(
              (series) => `
                <li class="au-filter-item">
                  <span class="au-filter-name">${escapeHtml(series.title)}</span>
                  <button type="button" class="au-data-btn" data-au-unhide="${escapeHtml(series.path)}">${escapeHtml(t("filters.unhide"))}</button>
                </li>
              `
            )
            .join("")}</ul>`;

    const genreHTML = genres
      .map(
        (name) => `
          <label class="au-filter-genre">
            <input type="checkbox" data-au-genre="${escapeHtml(name)}" ${excluded.has(name.toLowerCase()) ? "checked" : ""}>
            <span>${escapeHtml(name)}</span>
          </label>
        `
      )
      .join("");

    return `
      <div class="au-filter-heading">${escapeHtml(t("filters.hiddenHeading"))}</div>
      ${hiddenHTML}
      <div class="au-filter-heading">${escapeHtml(t("filters.genresHeading"))}</div>
      <div class="au-data-note">${escapeHtml(t("filters.genresNote"))}</div>
      <div class="au-filter-genres">${genreHTML}</div>
    `;
  }

  buttonFeedback(button: HTMLButtonElement, text: string): void {
    const original = button.dataset["auLabel"] || button.textContent || "";
    button.dataset["auLabel"] = original;
    button.textContent = text;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }

  reopenModal(): void {
    if (typeof this.modalCleanup === "function") this.modalCleanup();
    window.setTimeout(() => {
      this.renderModal();
      this.modalOpen = true;
    }, 200);
  }

  applyImportedConfig(parsed: Record<string, unknown>): void {
    Object.keys(DEFAULTS).forEach((key) => {
      if (!isConfigKey(key)) return;
      if (!(key in parsed)) return;
      ConfigStore.set(key, parsed[key]);
    });
    this.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
    this.onConfigChanged("language", ConfigStore.get("language"));
  }

  copyJsonToClipboard(json: string, promptLabel: string, button: HTMLButtonElement): void {
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      clipboard
        .writeText(json)
        .then(() => this.buttonFeedback(button, t("feedback.copied")))
        .catch(() => window.prompt(promptLabel, json));
    } else {
      window.prompt(promptLabel, json);
    }
  }

  handleDataAction(action: string | null, button: HTMLButtonElement): void {
    if (action === "export") {
      this.copyJsonToClipboard(
        JSON.stringify(ConfigStore.getAll(), null, 2),
        t("data.promptCopySettings"),
        button
      );
      return;
    }

    if (action === "export-history") {
      const json = JSON.stringify({ version: 1, history: HistoryStore.load() }, null, 2);
      this.copyJsonToClipboard(json, t("data.promptCopyHistory"), button);
      return;
    }

    if (action === "import-history") {
      const raw = window.prompt(t("data.promptPasteHistory"));
      if (!raw) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.buttonFeedback(button, t("feedback.invalidJson"));
        return;
      }
      const count = HistoryStore.importEntries(parsed);
      if (count === 0) {
        this.buttonFeedback(button, t("feedback.invalidJson"));
        return;
      }
      this.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
      this.refreshHistoryPanel();
      this.buttonFeedback(button, t("feedback.importedHistory", { count }));
      return;
    }

    if (action === "import") {
      const raw = window.prompt(t("data.promptPasteSettings"));
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("not an object");
        }
        this.applyImportedConfig(parsed as Record<string, unknown>);
        this.buttonFeedback(button, t("feedback.importedSettings"));
        this.reopenModal();
      } catch {
        this.buttonFeedback(button, t("feedback.invalidJson"));
      }
      return;
    }

    if (action === "reset") {
      if (!window.confirm(t("data.confirmReset"))) return;
      Object.keys(DEFAULTS).forEach((key) => {
        if (!isConfigKey(key)) return;
        ConfigStore.set(key, DEFAULTS[key]);
      });
      this.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
      this.onConfigChanged("language", ConfigStore.get("language"));
      this.reopenModal();
      return;
    }

    if (action === "clear-history") {
      if (!window.confirm(t("data.confirmClearHistory"))) return;
      HistoryStore.clear();
      this.refreshHistoryPanel();
      this.buttonFeedback(button, t("feedback.cleared"));
    }
  }
}
