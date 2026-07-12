import { isConfigKey } from "../config/defaults.js";
import type { AppConfig } from "../config/defaults.js";
import {
  KEYBIND_FIELDS,
  bindingToLabel,
  type KeybindField,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";

function renderShortcutRow(field: KeybindField, cfg: AppConfig): string {
  const help = "help" in field
    ? `<div class="au-shortcut-help">${field.help}</div>`
    : "";

  return `
    <div class="au-shortcut-row" data-shortcut-row="${field.key}">
      <div class="au-shortcut-meta">
        <div class="au-shortcut-name">${field.label}</div>
        ${help}
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
}

function groupShortcutFields(): Map<string, KeybindField[]> {
  const groups = new Map<string, KeybindField[]>();

  for (const field of KEYBIND_FIELDS) {
    const fields = groups.get(field.group) ?? [];
    fields.push(field);
    groups.set(field.group, fields);
  }

  return groups;
}

export function renderShortcutsEditor(cfg: AppConfig): string {
  const groups = Array.from(groupShortcutFields(), ([group, fields]) => `
    <div class="au-shortcut-card">
      <div class="au-shortcut-card-title">${group}</div>
      <div class="au-shortcut-grid">
        ${fields.map((field) => renderShortcutRow(field, cfg)).join("")}
      </div>
    </div>
  `).join("");

  return `
    <div class="au-shortcut-scroll">
      <div class="au-shortcut-intro">
        <div class="au-shortcut-intro-title">Rebind your controls</div>
        <div class="au-shortcut-intro-copy">
          Click a binding to capture a new key. Press <b>Esc</b> to cancel or <b>Backspace/Delete</b> to clear.
        </div>
      </div>
      <div class="au-shortcut-cards">
        ${groups}
      </div>
    </div>
  `;
}

export function setShortcutListeningState(
  overlay: ParentNode,
  key: string,
  isListening: boolean,
  labelOverride?: string,
): void {
  if (!key) return;

  const row = overlay.querySelector(`[data-shortcut-row="${key}"]`);
  const button = overlay.querySelector(`[data-shortcut-capture="${key}"]`);
  const label = button?.querySelector(".au-shortcut-bind-label");

  row?.classList.toggle("is-listening", isListening);
  button?.classList.toggle("is-listening", isListening);

  if (label) {
    label.textContent = isListening
      ? labelOverride ?? "Press a key..."
      : bindingToLabel(isConfigKey(key) ? ConfigStore.get(key) : "");
  }
}
