import type { AppConfig, ConfigKey } from "../config/defaults.js";
import type { SettingsPageKey } from "../config/settingsLayout.js";
import type { SettingsStatus, UndoAction } from "./settingsStatus.js";

// What each part of the open settings window needs from the window as a whole.
export interface SettingsWindow {
  readonly overlay: HTMLDialogElement;
  readonly status: SettingsStatus;
  onConfigChanged(key: ConfigKey, value: AppConfig[ConfigKey]): void;
  getActivePage(): SettingsPageKey;
  showPage(pageKey: SettingsPageKey): void;
  // Applies a change that touches many labels by rebuilding the window at once.
  rerender(status?: string, focusSelector?: string, undo?: UndoAction): void;
}
