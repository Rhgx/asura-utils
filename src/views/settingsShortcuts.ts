import { isConfigKey } from "../config/defaults.js";
import type { AppConfig } from "../config/defaults.js";
import {
  KEYBIND_FIELDS,
  bindingToLabel,
  type KeybindField,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { t } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";

function renderShortcutRow(field: KeybindField, cfg: AppConfig): string {
  const help = "helpKey" in field
    ? `<div class="au-shortcut-help">${escapeHtml(t(field.helpKey))}</div>`
    : "";

  return `
    <div class="au-shortcut-row" data-shortcut-row="${field.key}">
      <div class="au-shortcut-meta">
        <div class="au-shortcut-name">${escapeHtml(t(field.labelKey))}</div>
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
          ${escapeHtml(t("shortcuts.reset"))}
        </button>
      </div>
    </div>
  `;
}

function groupShortcutFields(): Map<MessageKey, KeybindField[]> {
  const groups = new Map<MessageKey, KeybindField[]>();

  for (const field of KEYBIND_FIELDS) {
    const fields = groups.get(field.groupKey) ?? [];
    fields.push(field);
    groups.set(field.groupKey, fields);
  }

  return groups;
}

export function renderShortcutsEditor(cfg: AppConfig): string {
  const groups = Array.from(groupShortcutFields(), ([groupKey, fields]) => `
    <div class="au-shortcut-card">
      <div class="au-shortcut-card-title">${escapeHtml(t(groupKey))}</div>
      <div class="au-shortcut-grid">
        ${fields.map((field) => renderShortcutRow(field, cfg)).join("")}
      </div>
    </div>
  `).join("");

  // The key names are markup supplied by code, so the translated sentence itself stays plain text.
  const introCopy = t("shortcuts.introCopy", {
    esc: "<b>Esc</b>",
    clear: "<b>Backspace/Delete</b>",
  });

  return `
    <div class="au-shortcut-scroll">
      <div class="au-shortcut-intro">
        <div class="au-shortcut-intro-title">${escapeHtml(t("shortcuts.introTitle"))}</div>
        <div class="au-shortcut-intro-copy">
          ${introCopy}
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
      ? labelOverride ?? t("shortcuts.pressKey")
      : bindingToLabel(isConfigKey(key) ? ConfigStore.get(key) : "");
  }
}
