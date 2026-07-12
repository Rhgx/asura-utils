import { APPEARANCE_MODAL_SECTION, READER_MODAL_SECTION } from "../config/modalSections.js";
import type { ModalSection } from "../config/modalSections.js";
import {
  KEYBIND_FIELDS,
  normalizeEventToBinding,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { HistoryStore } from "../store/historyStore.js";
import { DEFAULTS, isConfigKey } from "../config/defaults.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import packageJson from "../../package.json";
import {
  renderShortcutsEditor,
  setShortcutListeningState,
} from "./settingsShortcuts.js";

const APP_VERSION = packageJson.version;

const SETTING_TOOLTIPS: Partial<Record<ConfigKey, string>> = {
  adBlock: "Hides common ad containers and promo close buttons.",
  colorTimestamps:
    "Colors and weights chapter timestamps by recency; newer updates appear brighter and bolder.",
  hideSlider: "Removes the large featured slider on the home page.",
  hideToraka: "Hides Toraka promotion sections when detected.",
  hideComments: "Hides comment-related sections on supported pages.",
  hideDefaultBackToTop: "Hides the site's floating back-to-top control.",
  compactSidebar: "Shrinks right-side layout blocks to use less width.",
  hidePopularSection: "Hides popular/recommended sections when detected.",
  menuSeriesOverhaul: "Applies custom header and series-page styling tags.",
  themePreset: "Changes Asura Utils color tokens across supported UI.",
  readerWidget: "Shows the reader dock and enables reader controls.",
  showProgressBar: "Displays the top reading progress bar in reader pages.",
  fitWidthMode: "Lets chapter images expand to available screen width.",
  doubleClickScroll: "Double-click the page to start/stop auto-scroll.",
  hasPremiumAccess: "Skip premium-lock checks for chapter end actions.",
  chapterEndAction: "Action to run when you reach chapter end.",
  imageWidth: "Base max width used when Fit Width is disabled.",
  autoScrollSpeed: "Auto-scroll speed in pixels-per-frame steps.",
  trackReadingHistory:
    "Remembers your last-read chapter and progress per series.",
  resumeChapterPosition:
    "Jumps back to where you left off when reopening a chapter.",
  customAccentEnabled: "Overrides the theme accent with your own color.",
  customAccent: "Accent color used across the themed UI.",
  readerBrightness: "Dims chapter images for night reading (40-100%).",
};

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
    const profileLinks = document.querySelectorAll<HTMLElement>(
      'header a[href*="/login"], header a[href*="/dashboard"], header a[href*="/account"], header a[href*="/user/"]'
    );
    if (profileLinks.length === 0) return;

    const targetAnchor =
      Array.from(profileLinks).find((el) => el.offsetParent !== null) ||
      profileLinks[0]!;
    const insertionTarget =
      targetAnchor.closest(".mobile-menu-hide") ||
      targetAnchor.closest(".profile-menu-hide") ||
      targetAnchor.closest("astro-island") ||
      targetAnchor;
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
        title: "General",
        toggles: [
          ["adBlock", "Ad Blocker"],
          ["colorTimestamps", "Color Chapter Timestamps"],
          ["hideSlider", "Hide Home Slider"],
          ["hideToraka", "Hide Toraka Promo"],
          ["hideComments", "Hide Comments Section"],
          ["hideDefaultBackToTop", "Hide Site's Back-to-Top"],
        ],
      },
      {
        key: "layout",
        title: "Layout",
        toggles: [
          ["compactSidebar", "Compact Sidebar"],
          ["hidePopularSection", "Hide Popular Section"],
          ["menuSeriesOverhaul", "Overhaul Main Menu + Series Page"],
        ],
      },
      { ...APPEARANCE_MODAL_SECTION, key: "appearance" },
      { ...READER_MODAL_SECTION, key: "reader" },
      {
        key: "shortcuts",
        title: "Shortcuts",
        render: () => renderShortcutsEditor(cfg),
      },
      {
        key: "data",
        title: "Data",
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
            ${section.title}
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
              SETTING_TOOLTIPS[key] || ""
            )
          )
          .join("");

        const inputs = (section.inputs || [])
          .map((input) => {
            const isDisabled =
              (input.key === "imageWidth" && !!cfg.fitWidthMode) ||
              (input.key === "customAccent" && !cfg.customAccentEnabled);
            const tooltip = input.tooltip || SETTING_TOOLTIPS[input.key] || "";
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
                return `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
              })
              .join("");
            const tooltip = select.tooltip || SETTING_TOOLTIPS[select.key] || "";

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
            <div class="au-section-title">${section.title}</div>
            ${toggles}
            ${selects}
            ${inputs}
            ${staticHtml}
          </div>
        `;
      })
      .join("");

    overlay.innerHTML = `
      <div id="au-modal">
        <div class="au-modal-header">
          <span class="au-modal-title">Asura Utils Settings</span>
          <button type="button" class="au-close-btn" aria-label="Close settings">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <div class="au-tab-bar" role="tablist">
          ${tabButtonsHtml}
        </div>
        <div class="au-tab-panels">
          ${sectionHtml}
        </div>
        <div class="au-modal-signature">Made by Rocks &bull; v${APP_VERSION}</div>
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
      setShortcutListeningState(overlay, fieldKey, true, "Press a key...");
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
      };
    });
  }

  escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  controlLabelHTML(label: string, tooltip: string): string {
    const safeLabel = this.escapeHtml(label);
    if (!tooltip) return `<span>${safeLabel}</span>`;
    const safeTip = this.escapeHtml(tooltip);
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
        Export copies your settings as JSON to the clipboard. Import applies
        JSON from a paste prompt. Reading history stores your last-read
        chapter per series.
      </div>
      <div class="au-data-actions">
        <button type="button" class="au-data-btn" data-au-action="export">Export Settings</button>
        <button type="button" class="au-data-btn" data-au-action="import">Import Settings</button>
        <button type="button" class="au-data-btn" data-au-action="reset">Reset to Defaults</button>
        <button type="button" class="au-data-btn au-data-btn-danger" data-au-action="clear-history">Clear Reading History</button>
      </div>
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
  }

  handleDataAction(action: string | null, button: HTMLButtonElement): void {
    if (action === "export") {
      const json = JSON.stringify(ConfigStore.getAll(), null, 2);
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === "function") {
        clipboard
          .writeText(json)
          .then(() => this.buttonFeedback(button, "Copied!"))
          .catch(() => window.prompt("Copy settings JSON:", json));
      } else {
        window.prompt("Copy settings JSON:", json);
      }
      return;
    }

    if (action === "import") {
      const raw = window.prompt("Paste settings JSON to import:");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("not an object");
        }
        this.applyImportedConfig(parsed as Record<string, unknown>);
        this.buttonFeedback(button, "Imported!");
        this.reopenModal();
      } catch {
        this.buttonFeedback(button, "Invalid JSON");
      }
      return;
    }

    if (action === "reset") {
      if (!window.confirm("Reset all Asura Utils settings to defaults?")) return;
      Object.keys(DEFAULTS).forEach((key) => {
        if (!isConfigKey(key)) return;
        ConfigStore.set(key, DEFAULTS[key]);
      });
      this.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
      this.reopenModal();
      return;
    }

    if (action === "clear-history") {
      if (!window.confirm("Clear all saved reading history?")) return;
      HistoryStore.clear();
      this.buttonFeedback(button, "Cleared!");
    }
  }
}
