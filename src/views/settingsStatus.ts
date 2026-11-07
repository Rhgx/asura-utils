import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type { SettingsPageKey } from "../config/settingsLayout.js";

// Reverts the last change. Returns the control that focus belongs on afterward, or null when it has moved focus itself.
export type UndoAction = () => HTMLElement | null;

const PLAIN_MESSAGE_MS = 5000;

// Reports the result of an action in one place, at the bottom of the window, and offers Undo where it can.
export class SettingsStatus {
  private readonly bar: HTMLElement | null;
  private readonly text: HTMLElement | null;
  private readonly undoButton: HTMLButtonElement | null;
  private readonly showPage: (pageKey: SettingsPageKey) => void;
  private timer = 0;
  private undoAction: (() => void) | null = null;
  private undoRestoresEverything = false;

  constructor(overlay: ParentNode, showPage: (pageKey: SettingsPageKey) => void) {
    this.bar = overlay.querySelector("[data-au-status-bar]");
    this.text = overlay.querySelector("[data-au-status-text]");
    this.undoButton = overlay.querySelector("[data-au-status-undo]");
    this.showPage = showPage;
  }

  get hasUndo(): boolean {
    return this.undoAction !== null;
  }

  undo(): void {
    this.undoAction?.();
  }

  // Set restoresEverything for an Undo that puts back all settings at once.
  show(message: string, undo?: UndoAction, restoresEverything = false): void {
    const { bar, text, undoButton } = this;
    if (!bar || !text || !undoButton) return;

    window.clearTimeout(this.timer);
    text.textContent = message;
    bar.hidden = false;
    undoButton.hidden = !undo;
    this.undoAction = undo ? () => this.runUndo(undo) : null;
    this.undoRestoresEverything = restoresEverything;
    undoButton.onclick = this.undoAction;

    // An offer to undo has no timer: it lasts until the next result replaces it or the window closes.
    if (!undo) this.scheduleClear();
  }

  clear(): void {
    window.clearTimeout(this.timer);
    this.undoAction = null;
    if (this.bar) this.bar.hidden = true;
    if (this.text) this.text.textContent = "";
    if (this.undoButton) this.undoButton.onclick = null;
  }

  // Restoring every setting would silently discard a change made since, so that offer ends here.
  settingChanged(): void {
    if (this.undoRestoresEverything) this.clear();
  }

  // A message about the previous action would read as being about the next one, but an Undo stays useful.
  clearUnlessUndoable(): void {
    if (!this.hasUndo) this.clear();
  }

  // Stays while the pointer or focus is on it, so a slow reader does not lose it mid-sentence.
  private scheduleClear(): void {
    this.timer = window.setTimeout(() => {
      if (this.bar?.matches(":hover, :focus-within")) this.scheduleClear();
      else this.clear();
    }, PLAIN_MESSAGE_MS);
  }

  private runUndo(undo: UndoAction): void {
    this.clear();
    const target = undo();
    // The Undo may outlive the section it belongs to, so that section comes back with it.
    const page = target?.closest("[data-au-page]")?.getAttribute("data-au-page");
    const pageKey = SETTINGS_PAGES.find((candidate) => candidate.key === page)?.key;
    if (pageKey) this.showPage(pageKey);
    target?.focus();
    // The Undo button just disappeared, so focus must not be left behind on it.
    const active = document.activeElement;
    const isFocusVisible =
      active instanceof HTMLElement && !!active.closest("#au-modal") && active.offsetParent !== null;
    if (!isFocusVisible) document.querySelector<HTMLElement>("#au-modal")?.focus();
  }
}
