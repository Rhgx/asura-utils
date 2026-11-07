import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type { SettingsPageKey } from "../config/settingsLayout.js";
import { ConfigStore } from "../store/configStore.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import { t } from "../i18n/index.js";
import { bindSettingControls } from "./settingsControls.js";
import { bindDataActions } from "./settingsData.js";
import { bindLibraryPanels } from "./settingsLibrary.js";
import { settingsWindowHTML } from "./settingsMarkup.js";
import { bindSearchBox } from "./settingsSearchBox.js";
import { bindShortcutEditor } from "./settingsShortcuts.js";
import { SettingsStatus } from "./settingsStatus.js";
import type { UndoAction } from "./settingsStatus.js";
import type { SettingsWindow } from "./settingsWindow.js";

// Owns the window: opening, closing, section switching, and the keys that apply everywhere inside it.
export class SettingsModalView {
  readonly onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void;
  modalOpen: boolean;
  activePage: SettingsPageKey;
  modalCleanup: (() => void) | null;
  // Removes the open window at once, for a rebuild that must not wait out the close animation.
  modalFinalize: (() => void) | null;

  constructor(onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void) {
    this.onConfigChanged = onConfigChanged;
    this.modalOpen = false;
    this.activePage = "reader";
    this.modalCleanup = null;
    this.modalFinalize = null;
  }

  createHeaderButton() {
    const insertionTarget = this.findHeaderButtonTarget();
    if (!insertionTarget || !insertionTarget.parentNode) return;

    let btn = document.getElementById("au-settings-btn-main");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "au-settings-btn-main";
      btn.className = "au-settings-btn";
      btn.setAttribute("type", "button");
      btn.title = t("dock.settings");
      btn.setAttribute("aria-label", t("dock.openSettings"));
      btn.innerHTML =
        '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
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

  // A page opens the modal on that section; without one it reopens on the last section used.
  toggleModal(page?: SettingsPageKey) {
    const existing = document.getElementById("au-modal-overlay");
    if (existing) {
      if (typeof this.modalCleanup === "function") {
        this.modalCleanup();
      } else {
        existing.remove();
        this.modalOpen = false;
      }
    } else {
      if (page) this.activePage = page;
      this.renderModal();
      this.modalOpen = true;
    }
  }

  renderModal(): SettingsWindow {
    // A native modal dialog makes the rest of the page inert and returns focus to the opener when it closes.
    const overlay = document.createElement("dialog");
    overlay.id = "au-modal-overlay";
    overlay.setAttribute("aria-label", t("settings.title"));
    overlay.innerHTML = settingsWindowHTML(ConfigStore.getAll());
    document.body.appendChild(overlay);
    overlay.showModal();

    const showPage = this.bindSections(overlay);
    const win: SettingsWindow = {
      overlay,
      status: new SettingsStatus(overlay, showPage),
      onConfigChanged: this.onConfigChanged,
      getActivePage: () => this.activePage,
      showPage,
      rerender: (status, focusSelector, undo) => this.rerenderModal(status, focusSelector, undo),
    };

    const shortcuts = bindShortcutEditor(win);
    bindSearchBox(win);
    bindSettingControls(win);
    bindDataActions(win);
    bindLibraryPanels(win);

    let isClosing = false;
    let closeTimer = 0;
    const finalizeClose = () => {
      window.clearTimeout(closeTimer);
      win.status.clear();
      shortcuts.dispose();
      overlay.close();
      overlay.remove();
      // A language change rebuilds the page's controls, which can take the opener with it.
      if (document.activeElement === document.body) {
        document.getElementById("au-dock-settings")?.focus();
        if (document.activeElement === document.body) document.getElementById("au-settings-btn-main")?.focus();
      }
      this.modalCleanup = null;
      this.modalFinalize = null;
      this.modalOpen = false;
    };
    const close = () => {
      if (isClosing) return;
      isClosing = true;
      shortcuts.cancelCapture();
      overlay.classList.add("au-closing");
      closeTimer = window.setTimeout(finalizeClose, 180);
    };
    this.modalFinalize = finalizeClose;
    this.modalCleanup = close;
    this.bindWindowEvents(win, close);

    // Typing can start right away on desktop; on touch screens that would pop up the on-screen keyboard.
    if (window.matchMedia("(hover: none)").matches) overlay.querySelector<HTMLElement>("#au-modal")?.focus();
    else overlay.querySelector<HTMLElement>("[data-au-search-input]")?.focus();

    return win;
  }

  private bindSections(overlay: HTMLElement): (pageKey: SettingsPageKey) => void {
    const navButtons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("[data-au-nav]"));
    const pagePanels = Array.from(overlay.querySelectorAll<HTMLElement>("[data-au-page]"));
    const content = overlay.querySelector<HTMLElement>("[data-au-content]");
    const mainTitle = overlay.querySelector<HTMLElement>("[data-au-main-title]");
    const pageTitles = new Map(SETTINGS_PAGES.map((page) => [page.key, t(page.title)]));

    const showPage = (pageKey: SettingsPageKey) => {
      this.activePage = pageKey;
      navButtons.forEach((btn) => {
        const isActive = btn.getAttribute("data-au-nav") === pageKey;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        // Roving tabindex: the section list is one tab stop, and the arrow keys move inside it.
        btn.tabIndex = isActive ? 0 : -1;
      });
      pagePanels.forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-au-page") === pageKey);
      });
      if (mainTitle) mainTitle.textContent = pageTitles.get(pageKey) ?? "";
      if (content) content.scrollTop = 0;
    };

    navButtons.forEach((btn) => {
      btn.onclick = () => {
        const pageKey = SETTINGS_PAGES.find((page) => page.key === btn.getAttribute("data-au-nav"))?.key;
        if (pageKey) showPage(pageKey);
      };
      btn.onkeydown = (e) => {
        const index = navButtons.indexOf(btn);
        const targets: Readonly<Record<string, number>> = {
          ArrowDown: index + 1,
          ArrowRight: index + 1,
          ArrowUp: index - 1,
          ArrowLeft: index - 1,
          Home: 0,
          End: navButtons.length - 1,
        };
        const target = targets[e.key];
        if (target === undefined) return;
        e.preventDefault();
        const next = navButtons[(target + navButtons.length) % navButtons.length];
        next?.click();
        next?.focus();
      };
    });
    showPage(this.activePage);
    return showPage;
  }

  private bindWindowEvents(win: SettingsWindow, close: () => void): void {
    const { overlay, status } = win;
    const closeBtn = overlay.querySelector<HTMLButtonElement>(".au-close-btn");
    if (closeBtn) closeBtn.onclick = close;

    // Both ends of the click must be on the backdrop, so a drag that ends outside the window cannot close it.
    let pressStartedOnBackdrop = false;
    overlay.addEventListener("pointerdown", (e) => {
      pressStartedOnBackdrop = e.target === overlay;
    });
    overlay.onclick = (e) => {
      if (e.target === overlay && pressStartedOnBackdrop) close();
    };

    // Esc peels one layer at a time: search, shortcut capture, menus, and import panels all mark
    // the event as handled, so only an unhandled Esc reaches this and closes the window.
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        close();
      }
      // Undo sits after the whole list in tab order, so a keyboard user can reach it without walking there.
      // A text field with something in it keeps Ctrl+Z for its own typing.
      const target = e.target;
      const isTyping =
        (target instanceof HTMLInputElement && target.type !== "checkbox" && target.type !== "color") ||
        target instanceof HTMLTextAreaElement;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey &&
        status.hasUndo &&
        !(isTyping && target.value !== "")
      ) {
        e.preventDefault();
        status.undo();
      }
      // The site listens on document, and its reader keys must not act behind the window.
      e.stopPropagation();
    });
    // Covers close requests that arrive without a key press, such as Android's back gesture.
    overlay.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    // Only the panes that scroll may take the wheel; anywhere else it would scroll the chapter behind the window.
    overlay.addEventListener(
      "wheel",
      (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target?.closest(".au-content, .au-nav, .au-search-results")) e.preventDefault();
      },
      { passive: false },
    );
  }

  private rerenderModal(status?: string, focusSelector?: string, undo?: UndoAction): void {
    this.modalFinalize?.();
    const win = this.renderModal();
    this.modalOpen = true;
    if (focusSelector) win.overlay.querySelector<HTMLElement>(focusSelector)?.focus();
    if (status) win.status.show(status, undo, !!undo);
  }
}
