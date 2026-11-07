import { DEFAULTS, isConfigKey } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import { HistoryStore } from "../store/historyStore.js";
import { t } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import { refreshHistoryPanel } from "./settingsLibrary.js";
import { searchText } from "./settingsSearch.js";
import type { SettingsWindow } from "./settingsWindow.js";

// Each button is its own search result, so "export" or "reset" finds these actions.
export function dataActionsHTML(
  actions: readonly (readonly [action: string, label: MessageKey, danger?: boolean])[]
): string {
  const buttons = actions
    .map(([action, labelKey, danger]) => {
      const label = t(labelKey);
      return `
        <button
          type="button"
          class="au-data-btn${danger ? " au-data-btn-danger" : ""}"
          data-au-action="${action}"
          ${action.startsWith("import") ? 'aria-expanded="false"' : ""}
          data-au-search="${escapeHtml(searchText(label))}"
          data-au-label="${escapeHtml(label)}"
        >${escapeHtml(label)}</button>
      `;
    })
    .join("");
  return `<div class="au-data-actions">${buttons}</div>`;
}

export function importPanelHTML(action: string, label: MessageKey): string {
  const id = `au-import-${action}`;
  return `
    <div class="au-import" data-au-import-panel="${action}" hidden>
      <label class="au-import-label" for="${id}">${escapeHtml(t(label))}</label>
      <textarea class="au-import-input" id="${id}" rows="5" spellcheck="false" aria-describedby="${id}-error" data-au-import-input></textarea>
      <div class="au-import-error" id="${id}-error" role="alert" data-au-import-error></div>
      <div class="au-import-actions">
        <button type="button" class="au-data-btn au-data-btn-primary" data-au-import-apply>${escapeHtml(t("data.apply"))}</button>
        <button type="button" class="au-data-btn" data-au-import-cancel>${escapeHtml(t("data.cancel"))}</button>
      </div>
    </div>
  `;
}

function applyConfig(win: SettingsWindow, values: Readonly<Record<string, unknown>>): void {
  Object.keys(DEFAULTS).forEach((key) => {
    if (!isConfigKey(key)) return;
    if (!(key in values)) return;
    ConfigStore.set(key, values[key]);
  });
  win.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
  win.onConfigChanged("language", ConfigStore.get("language"));
}

// Replaces the whole configuration, with an Undo that puts the previous one back.
function replaceConfig(
  win: SettingsWindow,
  values: Readonly<Record<string, unknown>>,
  message: string,
  focusSelector: string,
): void {
  const previous = ConfigStore.getAll();
  applyConfig(win, values);
  win.rerender(message, focusSelector, () => {
    applyConfig(win, previous);
    win.rerender(t("feedback.undone"), focusSelector);
    return null;
  });
}

// Returns the message to show when the text cannot be imported.
function applyImport(win: SettingsWindow, action: string, raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return t("feedback.invalidJson");
  }

  if (action === "import-history") {
    const count = HistoryStore.importEntries(parsed);
    if (count === 0) return t("feedback.noHistoryEntries");
    win.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
    refreshHistoryPanel(win.overlay);
    win.status.show(t("feedback.importedHistory", { count }));
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return t("feedback.noSettingsFound");
  if (!Object.keys(parsed).some((key) => isConfigKey(key))) return t("feedback.noSettingsFound");
  replaceConfig(win, parsed as Record<string, unknown>, t("feedback.importedSettings"), '[data-au-action="import"]');
  return null;
}

// Import happens in a panel inside the window, so a mistake is explained in place and the paste is not lost.
function bindImportPanel(win: SettingsWindow, panel: HTMLElement): void {
  const action = panel.getAttribute("data-au-import-panel");
  const input = panel.querySelector<HTMLTextAreaElement>("[data-au-import-input]");
  const error = panel.querySelector<HTMLElement>("[data-au-import-error]");
  const opener = panel.closest(".au-group")?.querySelector<HTMLButtonElement>(`[data-au-action="${action}"]`);
  if (!action || !input || !error) return;

  const hide = () => {
    panel.hidden = true;
    input.value = "";
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    opener?.setAttribute("aria-expanded", "false");
    opener?.focus();
  };
  const apply = () => {
    const problem = applyImport(win, action, input.value);
    if (problem) {
      win.status.clearUnlessUndoable();
      error.textContent = problem;
      input.setAttribute("aria-invalid", "true");
      input.focus();
    } else if (input.isConnected) {
      // A settings import rebuilds the whole window, which already leaves this panel closed.
      hide();
    }
  };

  panel.querySelector<HTMLButtonElement>("[data-au-import-apply]")?.addEventListener("click", apply);
  panel.querySelector<HTMLButtonElement>("[data-au-import-cancel]")?.addEventListener("click", hide);
  input.addEventListener("input", () => {
    error.textContent = "";
    input.removeAttribute("aria-invalid");
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    hide();
  });
}

function copyJson(win: SettingsWindow, json: string, promptLabel: string, successMessage: string): void {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    clipboard
      .writeText(json)
      .then(() => win.status.show(successMessage))
      .catch(() => window.prompt(promptLabel, json));
  } else {
    window.prompt(promptLabel, json);
  }
}

function toggleImportPanel(button: HTMLButtonElement, action: string): void {
  const panel = button.closest(".au-group")?.querySelector<HTMLElement>(`[data-au-import-panel="${action}"]`);
  if (!panel) return;
  if (!panel.hidden) {
    panel.querySelector<HTMLButtonElement>("[data-au-import-cancel]")?.click();
    return;
  }
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  panel.querySelector<HTMLElement>("[data-au-import-input]")?.focus();
}

function runDataAction(win: SettingsWindow, action: string | null, button: HTMLButtonElement): void {
  switch (action) {
    case "export":
      copyJson(win, JSON.stringify(ConfigStore.getAll(), null, 2), t("data.promptCopySettings"), t("feedback.copiedSettings"));
      return;
    case "export-history": {
      const json = JSON.stringify({ version: 1, history: HistoryStore.load() }, null, 2);
      copyJson(win, json, t("data.promptCopyHistory"), t("feedback.copiedHistory"));
      return;
    }
    case "import":
    case "import-history":
      toggleImportPanel(button, action);
      return;
    case "reset":
      if (!window.confirm(t("data.confirmReset"))) return;
      replaceConfig(win, DEFAULTS, t("feedback.resetDone"), '[data-au-action="reset"]');
      return;
    case "clear-history": {
      if (!window.confirm(t("data.confirmClearHistory"))) return;
      const previous = HistoryStore.load();
      HistoryStore.clear();
      refreshHistoryPanel(win.overlay);
      win.status.show(t("feedback.cleared"), () => {
        Object.entries(previous).forEach(([key, entry]) => HistoryStore.restore(key, entry));
        refreshHistoryPanel(win.overlay);
        win.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
        return button;
      });
    }
  }
}

export function bindDataActions(win: SettingsWindow): void {
  win.overlay.querySelectorAll<HTMLButtonElement>("[data-au-action]").forEach((button) => {
    button.onclick = () => {
      win.status.clearUnlessUndoable();
      runDataAction(win, button.getAttribute("data-au-action"), button);
    };
  });
  win.overlay.querySelectorAll<HTMLElement>("[data-au-import-panel]").forEach((panel) => bindImportPanel(win, panel));
}
