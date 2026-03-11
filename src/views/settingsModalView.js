import { APPEARANCE_MODAL_SECTION, READER_MODAL_SECTION } from "../config/modalSections.js";
import {
  KEYBIND_FIELDS,
  bindingToLabel,
  normalizeEventToBinding,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";

const SETTING_TOOLTIPS = {
  adBlock: "Hides common ad containers and promo close buttons.",
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
};

export class SettingsModalView {
  constructor(onConfigChanged) {
    this.onConfigChanged = onConfigChanged;
    this.modalOpen = false;
    this.activeTabKey = "general";
    this.modalCleanup = null;
  }

  createHeaderButton() {
    const profileLinks = document.querySelectorAll(
      'header a[href*="/login"], header a[href*="/dashboard"]'
    );
    if (profileLinks.length === 0) return;

    const targetAnchor =
      Array.from(profileLinks).find((el) => el.offsetParent !== null) ||
      profileLinks[0];
    const container =
      targetAnchor.closest('div[style*="width: auto"]') ||
      targetAnchor.parentElement;
    if (!container || !container.parentNode) return;

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

      container.parentNode.insertBefore(btn, container);
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

    const sections = [
      {
        key: "general",
        title: "General",
        toggles: [
          ["adBlock", "Ad Blocker"],
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
        render: () => this.shortcutsEditorHTML(cfg),
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
              input.key === "imageWidth" && !!cfg.fitWidthMode;
            const tooltip = input.tooltip || SETTING_TOOLTIPS[input.key] || "";
            return `
              <div class="au-control-row">
                ${this.controlLabelHTML(input.label, tooltip)}
                <input
                  type="${input.type}"
                  id="${input.id}"
                  class="au-input-num"
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
          <span class="au-close-btn">&times;</span>
        </div>
        <div class="au-tab-bar" role="tablist">
          ${tabButtonsHtml}
        </div>
        <div class="au-tab-panels">
          ${sectionHtml}
        </div>
        <div class="au-modal-signature">By Rocks</div>
      </div>
    `;

    document.body.appendChild(overlay);

    let resizeHandler = null;
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

      this.stopShortcutCapture(overlay, listeningShortcutKey);
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

    const closeBtn = overlay.querySelector(".au-close-btn");
    if (closeBtn) closeBtn.onclick = close;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const tabButtons = Array.from(overlay.querySelectorAll(".au-tab-btn"));
    const tabPanels = Array.from(overlay.querySelectorAll(".au-tab-panel"));
    const panelsWrap = overlay.querySelector(".au-tab-panels");

    const syncPanelMinHeight = () => {
      if (!panelsWrap || tabPanels.length === 0) return;
      const wrapWidth = panelsWrap.clientWidth || 1;
      let maxHeight = 0;

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
    const startShortcutCapture = (fieldKey) => {
      if (!fieldKey) return;
      if (listeningShortcutKey && listeningShortcutKey !== fieldKey) {
        this.stopShortcutCapture(overlay, listeningShortcutKey);
      }
      if (listeningShortcutKey === fieldKey) {
        this.stopShortcutCapture(overlay, fieldKey);
        listeningShortcutKey = "";
        return;
      }
      listeningShortcutKey = fieldKey;
      this.setShortcutListeningState(overlay, fieldKey, true, "Press a key...");
    };

    const captureShortcutKeydown = (event) => {
      if (!listeningShortcutKey) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        this.stopShortcutCapture(overlay, listeningShortcutKey);
        listeningShortcutKey = "";
        return;
      }

      const isClearKey = event.key === "Backspace" || event.key === "Delete";
      const binding = isClearKey ? "" : normalizeEventToBinding(event);
      if (!isClearKey && !binding) return;

      const value = ConfigStore.set(listeningShortcutKey, binding);
      this.onConfigChanged(listeningShortcutKey, value);
      this.stopShortcutCapture(overlay, listeningShortcutKey);
      listeningShortcutKey = "";
    };

    const setActiveTab = (tabKey) => {
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

    overlay.querySelectorAll(".au-toggle input").forEach((input) => {
      input.onchange = (e) => {
        const key = e.target.getAttribute("data-key");
        const value = !!e.target.checked;
        ConfigStore.set(key, value);
        this.onConfigChanged(key, value);

          if (key === "fitWidthMode") {
            const widthInput = overlay.querySelector("#inp-imageWidth");
            if (widthInput) {
              widthInput.disabled = value;
              widthInput.style.opacity = value ? "0.5" : "1";
            }
          }

          syncPanelMinHeight();
        };
      });
    overlay.querySelectorAll("[data-shortcut-capture]").forEach((button) => {
      button.onclick = () => {
        startShortcutCapture(button.getAttribute("data-shortcut-capture"));
      };
    });

    overlay.querySelectorAll("[data-shortcut-reset]").forEach((button) => {
      button.onclick = () => {
        const key = button.getAttribute("data-shortcut-reset");
        const field = keybindFieldMap.get(key);
        if (!field) return;
        const value = ConfigStore.set(key, field.defaultBinding);
        this.onConfigChanged(key, value);
        this.setShortcutListeningState(overlay, key, false);
        if (listeningShortcutKey === key) listeningShortcutKey = "";
      };
    });

    overlay.querySelectorAll(".au-input-num[data-key]").forEach((input) => {
      input.onchange = (e) => {
        const key = e.target.getAttribute("data-key");
        const value = ConfigStore.set(key, e.target.value);
        e.target.value = String(value);
        this.onConfigChanged(key, value);
      };
    });

    overlay.querySelectorAll(".au-input-select[data-key]").forEach((select) => {
      select.onchange = (e) => {
        const key = e.target.getAttribute("data-key");
        const value = ConfigStore.set(key, e.target.value);
        e.target.value = String(value);
        this.onConfigChanged(key, value);
      };
    });
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  controlLabelHTML(label, tooltip) {
    const safeLabel = this.escapeHtml(label);
    if (!tooltip) return `<span>${safeLabel}</span>`;
    const safeTip = this.escapeHtml(tooltip);
    return `
      <span class="au-control-label" title="${safeTip}">
        <span>${safeLabel}</span>
        <span class="au-control-tooltip" aria-hidden="true" title="${safeTip}">?</span>
      </span>
    `;
  }

  toggleHTML(key, label, checked, tooltip = "") {
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

  shortcutsEditorHTML(cfg) {
    const grouped = KEYBIND_FIELDS.reduce((acc, field) => {
      if (!acc[field.group]) acc[field.group] = [];
      acc[field.group].push(field);
      return acc;
    }, {});
    const groupsHtml = Object.entries(grouped)
      .map(([group, fields]) => {
        const rows = fields
          .map((field) => {
            const helpHtml = field.help
              ? `<div class="au-shortcut-help">${field.help}</div>`
              : "";
            return `
              <div class="au-shortcut-row" data-shortcut-row="${field.key}">
                <div class="au-shortcut-meta">
                  <div class="au-shortcut-name">${field.label}</div>
                  ${helpHtml}
                </div>
                <div class="au-shortcut-actions">
                  <button
                    type="button"
                    class="au-shortcut-bind-btn"
                    data-shortcut-capture="${field.key}"
                  >
                    <span class="au-shortcut-bind-label">${bindingToLabel(cfg[field.key])}</span>
                  </button>
                  <button
                    type="button"
                    class="au-shortcut-reset-btn"
                    data-shortcut-reset="${field.key}"
                  >
                    Reset
                  </button>
                </div>
              </div>
            `;
          })
          .join("");
        return `
          <div class="au-shortcut-card">
            <div class="au-shortcut-card-title">${group}</div>
            <div class="au-shortcut-grid">
              ${rows}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="au-shortcut-scroll">
        <div class="au-shortcut-intro">
          <div class="au-shortcut-intro-title">Rebind your controls</div>
          <div class="au-shortcut-intro-copy">
            Click a binding to capture a new key. Press <b>Esc</b> to cancel or <b>Backspace/Delete</b> to clear.
          </div>
        </div>
        <div class="au-shortcut-cards">
          ${groupsHtml}
        </div>
      </div>
    `;
  }

  setShortcutListeningState(overlay, key, isListening, labelOverride) {
    if (!overlay || !key) return;
    const row = overlay.querySelector(`[data-shortcut-row="${key}"]`);
    const bindButton = overlay.querySelector(`[data-shortcut-capture="${key}"]`);
    const label = bindButton && bindButton.querySelector(".au-shortcut-bind-label");
    if (row) row.classList.toggle("is-listening", !!isListening);
    if (bindButton) bindButton.classList.toggle("is-listening", !!isListening);
    if (label) {
      const text =
        isListening
          ? labelOverride || "Press a key..."
          : bindingToLabel(ConfigStore.get(key));
      label.textContent = text;
    }
  }

  stopShortcutCapture(overlay, key) {
    if (!key) return;
    this.setShortcutListeningState(overlay, key, false);
  }
}
