import { isConfigKey } from "../config/defaults.js";
import type { AppConfig } from "../config/defaults.js";
import {
  KEYBIND_FIELDS,
  bindingToLabel,
  findKeybindConflict,
  normalizeEventToBinding,
  type KeybindField,
  type KeybindKey,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { t } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import { searchText } from "./settingsSearch.js";
import type { SettingsWindow } from "./settingsWindow.js";

function changeLabel(field: KeybindField, binding: unknown): string {
  return t("shortcuts.changeLabel", { action: t(field.labelKey), key: bindingToLabel(binding) });
}

function renderShortcutRow(field: KeybindField, cfg: AppConfig): string {
  const label = t(field.labelKey);
  const helpText = "helpKey" in field ? t(field.helpKey) : "";
  const help = helpText
    ? `<span class="au-setting-hint">${escapeHtml(helpText)}</span>`
    : "";
  const isDefault = cfg[field.key] === field.defaultBinding;

  return `
    <div class="au-setting-row au-shortcut-row" data-shortcut-row="${field.key}" data-au-search="${escapeHtml(searchText(`${label} ${helpText}`))}" data-au-label="${escapeHtml(label)}">
      <span class="au-setting-text">
        <span class="au-setting-label">${escapeHtml(label)}</span>
        ${help}
      </span>
      <div class="au-shortcut-actions">
        <button
          type="button"
          class="au-shortcut-reset-btn${isDefault ? " is-default" : ""}"
          data-shortcut-reset="${field.key}"
          aria-label="${escapeHtml(t("shortcuts.resetLabel", { action: label }))}"
        >
          ${escapeHtml(t("shortcuts.reset"))}
        </button>
        <button
          type="button"
          class="au-shortcut-bind-btn"
          data-shortcut-capture="${field.key}"
          aria-label="${escapeHtml(changeLabel(field, cfg[field.key]))}"
        >
          <span class="au-shortcut-bind-label">${escapeHtml(bindingToLabel(cfg[field.key]))}</span>
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
    <section class="au-group">
      <h3 class="au-group-title">${escapeHtml(t(groupKey))}</h3>
      <div class="au-card">
        ${fields.map((field) => renderShortcutRow(field, cfg)).join("")}
      </div>
    </section>
  `).join("");

  // The key names are markup supplied by code, so the translated sentence itself stays plain text.
  const introCopy = t("shortcuts.introCopy", {
    esc: "<kbd>Esc</kbd>",
    clear: "<kbd>Backspace</kbd>",
  });

  return `
    <div class="au-shortcut-editor">
      <p class="au-data-note au-shortcut-intro">${introCopy}</p>
      <p class="au-data-note au-shortcut-touch-note">${escapeHtml(t("shortcuts.touchNote"))}</p>
      ${groups}
    </div>
  `;
}

// Brings a row's key, names, and reset button in line with the stored binding.
export function refreshShortcutRow(overlay: ParentNode, key: string): void {
  const field = KEYBIND_FIELDS.find((candidate) => candidate.key === key);
  if (!field) return;
  const binding = ConfigStore.get(field.key);
  const button = overlay.querySelector(`[data-shortcut-capture="${key}"]`);
  const label = button?.querySelector(".au-shortcut-bind-label");
  if (label) label.textContent = bindingToLabel(binding);
  button?.setAttribute("aria-label", changeLabel(field, binding));
  overlay
    .querySelector(`[data-shortcut-reset="${key}"]`)
    ?.classList.toggle("is-default", binding === field.defaultBinding);
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

  if (isListening) {
    const prompt = labelOverride ?? t("shortcuts.pressKey");
    if (label) label.textContent = prompt;
    button?.setAttribute("aria-label", prompt);
  } else if (isConfigKey(key)) {
    refreshShortcutRow(overlay, key);
  }
}

// Binding a key another action already uses moves it, because one key cannot do two things.
function assignShortcut(win: SettingsWindow, field: KeybindField, binding: string): void {
  const { overlay } = win;
  const previous = ConfigStore.get(field.key);
  if (previous === binding) {
    refreshShortcutRow(overlay, field.key);
    return;
  }
  const conflict = findKeybindConflict(field.key, binding, (key) => ConfigStore.get(key));
  const write = (key: KeybindKey, value: string) => {
    win.onConfigChanged(key, ConfigStore.set(key, value));
    refreshShortcutRow(overlay, key);
  };
  if (conflict) write(conflict.key, "");
  write(field.key, binding);

  const action = t(field.labelKey);
  const key = bindingToLabel(binding);
  const message = conflict
    ? t("feedback.shortcutMoved", { key, other: t(conflict.labelKey), action })
    : binding
      ? t("feedback.shortcutSet", { action, key })
      : t("feedback.shortcutCleared", { action });
  win.status.show(message, () => {
    write(field.key, previous);
    if (conflict) write(conflict.key, binding);
    return overlay.querySelector<HTMLElement>(`[data-shortcut-capture="${field.key}"]`);
  });
}

export interface ShortcutEditor {
  cancelCapture(): void;
  dispose(): void;
}

export function bindShortcutEditor(win: SettingsWindow): ShortcutEditor {
  const { overlay } = win;
  let listeningKey = "";

  const cancelCapture = () => {
    setShortcutListeningState(overlay, listeningKey, false);
    listeningKey = "";
  };

  const captureKeydown = (event: KeyboardEvent) => {
    if (!listeningKey) return;
    // Tab must keep moving focus, so keyboard users cannot get stuck or bind it by accident.
    if (event.key === "Tab") {
      cancelCapture();
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      cancelCapture();
      return;
    }

    const isClearKey = event.key === "Backspace" || event.key === "Delete";
    const binding = isClearKey ? "" : normalizeEventToBinding(event);
    if (!isClearKey && !binding) return;

    const field = KEYBIND_FIELDS.find((candidate) => candidate.key === listeningKey);
    if (!field) return;
    cancelCapture();
    assignShortcut(win, field, binding);
  };
  document.addEventListener("keydown", captureKeydown, true);

  // A press anywhere else cancels a capture in progress, instead of leaving it listening unseen.
  overlay.addEventListener("pointerdown", (e) => {
    if (!listeningKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target?.closest("[data-shortcut-capture]")) cancelCapture();
  });

  overlay.querySelectorAll<HTMLButtonElement>("[data-shortcut-capture]").forEach((button) => {
    button.onclick = () => {
      const fieldKey = button.getAttribute("data-shortcut-capture");
      if (!fieldKey) return;
      if (listeningKey === fieldKey) {
        cancelCapture();
        return;
      }
      if (listeningKey) cancelCapture();
      listeningKey = fieldKey;
      setShortcutListeningState(overlay, fieldKey, true, t("shortcuts.pressKey"));
    };
  });

  overlay.querySelectorAll<HTMLButtonElement>("[data-shortcut-reset]").forEach((button) => {
    button.onclick = () => {
      const field = KEYBIND_FIELDS.find((candidate) => candidate.key === button.getAttribute("data-shortcut-reset"));
      if (!field) return;
      if (listeningKey) cancelCapture();
      assignShortcut(win, field, field.defaultBinding);
      // The reset button hides itself once the binding is the default, so focus moves to the key beside it.
      overlay.querySelector<HTMLElement>(`[data-shortcut-capture="${field.key}"]`)?.focus();
    };
  });

  return {
    cancelCapture,
    dispose: () => document.removeEventListener("keydown", captureKeydown, true),
  };
}
