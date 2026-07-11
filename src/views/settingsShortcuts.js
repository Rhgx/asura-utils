import { KEYBIND_FIELDS, bindingToLabel } from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";

export function shortcutsEditorHTML(view, cfg) {
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

export function setShortcutListeningState(overlay, key, isListening, labelOverride) {
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

export function stopShortcutCapture(view, overlay, key) {
    if (!key) return;
    view.setShortcutListeningState(overlay, key, false);
  }
