import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type {
  ChecklistItem,
  GroupContent,
  SettingRow,
  SettingsGroup,
  SettingsPage,
  SettingsPageKey,
} from "../config/settingsLayout.js";
import {
  KEYBIND_FIELDS,
  normalizeEventToBinding,
} from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import {
  COMPLETED_THRESHOLD,
  HistoryStore,
  chapterSlugToLabel,
  formatHistoryAge,
} from "../store/historyStore.js";
import { FilterStore } from "../store/filterStore.js";
import { CONFIG_META, DEFAULTS, isConfigKey } from "../config/defaults.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import packageJson from "../../package.json";
import {
  renderShortcutsEditor,
  setShortcutListeningState,
} from "./settingsShortcuts.js";
import { formatPercent, t, tPlural } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import { PAGE_ICONS, SEARCH_ICON, rocksEmblemSvg } from "./settingsIcons.js";
import { matchesSearch, searchText } from "./settingsSearch.js";

const APP_VERSION = packageJson.version;
const AUTHOR_NAME = "Rocks";
const AUTHOR_URL = "https://github.com/Rhgx";
const RELEASES_URL = "https://github.com/Rhgx/asura-utils/releases";

function dependencyAttrs(item: Pick<SettingRow, "requires" | "disabledWhen">): string {
  return [
    item.requires ? `data-au-requires="${item.requires}"` : "",
    item.disabledWhen ? `data-au-disabled-when="${item.disabledWhen}"` : "",
  ].join(" ");
}

export class SettingsModalView {
  readonly onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void;
  modalOpen: boolean;
  activePage: SettingsPageKey;
  modalCleanup: (() => void) | null;

  constructor(onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void) {
    this.onConfigChanged = onConfigChanged;
    this.modalOpen = false;
    this.activePage = "reader";
    this.modalCleanup = null;
  }

  createHeaderButton() {
    const insertionTarget = this.findHeaderButtonTarget();
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

  renderModal() {
    const cfg = ConfigStore.getAll();
    const overlay = document.createElement("div");
    overlay.id = "au-modal-overlay";

    const navHTML = (pages: readonly SettingsPage[]) =>
      pages.map((page) => this.navButtonHTML(page)).join("");
    const credit = escapeHtml(t("settings.madeBy", { author: AUTHOR_NAME }));

    overlay.innerHTML = `
      <div id="au-modal" role="dialog" aria-modal="true" aria-labelledby="au-modal-title">
        <aside class="au-sidebar">
          <div class="au-sidebar-title" id="au-modal-title">${escapeHtml(t("settings.title"))}</div>
          <label class="au-search">
            ${SEARCH_ICON}
            <input
              type="search"
              class="au-search-input"
              placeholder="${escapeHtml(t("settings.search"))}"
              aria-label="${escapeHtml(t("settings.search"))}"
              autocomplete="off"
              spellcheck="false"
              data-au-search-input
            >
          </label>
          <nav class="au-nav" role="tablist" aria-orientation="vertical" aria-label="${escapeHtml(t("settings.sections"))}">
            ${navHTML(SETTINGS_PAGES.filter((page) => !page.footer))}
            <div class="au-nav-spacer" aria-hidden="true"></div>
            ${navHTML(SETTINGS_PAGES.filter((page) => page.footer))}
          </nav>
          <footer class="au-credits">
            <a class="au-credits-link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">
              <span class="au-credits-avatar">${rocksEmblemSvg}</span>
              ${credit}
            </a>
            <span class="au-credits-dot" aria-hidden="true">&middot;</span>
            <a class="au-credits-link" href="${RELEASES_URL}" target="_blank" rel="noopener noreferrer">v${APP_VERSION}</a>
          </footer>
        </aside>
        <div class="au-main">
          <div class="au-main-header">
            <h2 class="au-main-title" data-au-main-title></h2>
            <button type="button" class="au-close-btn" aria-label="${escapeHtml(t("settings.close"))}">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div class="au-content" data-au-content>
            ${SETTINGS_PAGES.map((page) => this.pageHTML(page, cfg)).join("")}
            <div class="au-search-empty" data-au-search-empty hidden>${escapeHtml(t("settings.noResults"))}</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

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

      overlay.classList.add("au-closing");
      closeTimer = window.setTimeout(finalizeClose, 180);
    };
    this.modalCleanup = close;

    const closeBtn = overlay.querySelector<HTMLButtonElement>(".au-close-btn");
    if (closeBtn) closeBtn.onclick = close;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const navButtons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("[data-au-nav]"));
    const pagePanels = Array.from(overlay.querySelectorAll<HTMLElement>("[data-au-page]"));
    const content = overlay.querySelector<HTMLElement>("[data-au-content]");
    const mainTitle = overlay.querySelector<HTMLElement>("[data-au-main-title]");
    const searchInput = overlay.querySelector<HTMLInputElement>("[data-au-search-input]");
    const searchEmpty = overlay.querySelector<HTMLElement>("[data-au-search-empty]");
    const pageTitles = new Map(SETTINGS_PAGES.map((page) => [page.key, t(page.title)]));

    const setActivePage = (pageKey: SettingsPageKey) => {
      this.activePage = pageKey;
      navButtons.forEach((btn) => {
        const isActive = btn.getAttribute("data-au-nav") === pageKey;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      pagePanels.forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-au-page") === pageKey);
      });
      if (mainTitle) mainTitle.textContent = pageTitles.get(pageKey) ?? "";
      if (content) content.scrollTop = 0;
    };

    // Search filters every page in place: unmatched rows, then empty groups and pages, are hidden.
    // Lists and notes that are not settings are hidden by CSS while a search is active.
    const applySearch = (query: string) => {
      if (!content) return;
      const trimmed = query.trim();
      const items = content.querySelectorAll<HTMLElement>("[data-au-search]");
      const groups = content.querySelectorAll<HTMLElement>("[data-au-group]");
      content.classList.toggle("is-searching", trimmed !== "");

      if (!trimmed) {
        items.forEach((item) => { item.hidden = false; });
        groups.forEach((group) => { group.hidden = false; });
        pagePanels.forEach((panel) => { panel.hidden = false; });
        if (searchEmpty) searchEmpty.hidden = true;
        setActivePage(this.activePage);
        return;
      }

      items.forEach((item) => {
        item.hidden = !matchesSearch(item.getAttribute("data-au-search") ?? "", trimmed);
      });
      const hasMatch = (el: HTMLElement) => el.querySelector("[data-au-search]:not([hidden])") !== null;
      groups.forEach((group) => { group.hidden = !hasMatch(group); });
      pagePanels.forEach((panel) => { panel.hidden = !hasMatch(panel); });

      navButtons.forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });
      if (searchEmpty) searchEmpty.hidden = pagePanels.some((panel) => !panel.hidden);
      if (mainTitle) mainTitle.textContent = t("settings.searchResults");
      content.scrollTop = 0;
    };

    const clearSearch = () => {
      if (!searchInput || searchInput.value === "") return;
      searchInput.value = "";
      applySearch("");
    };

    searchInput?.addEventListener("input", () => applySearch(searchInput.value));
    searchInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || searchInput.value === "") return;
      e.preventDefault();
      clearSearch();
    });

    navButtons.forEach((btn) => {
      btn.onclick = () => {
        const pageKey = SETTINGS_PAGES.find((page) => page.key === btn.getAttribute("data-au-nav"))?.key;
        if (!pageKey) return;
        clearSearch();
        setActivePage(pageKey);
      };
    });
    setActivePage(this.activePage);

    // Rows that depend on another setting are disabled while that setting blocks them.
    const syncDependencies = () => {
      overlay.querySelectorAll<HTMLElement>("[data-au-requires], [data-au-disabled-when]").forEach((el) => {
        const requires = el.getAttribute("data-au-requires");
        const disabledWhen = el.getAttribute("data-au-disabled-when");
        const isDisabled =
          (isConfigKey(requires) && !ConfigStore.get(requires)) ||
          (isConfigKey(disabledWhen) && !!ConfigStore.get(disabledWhen));
        el.classList.toggle("is-disabled", isDisabled);
        el.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((control) => {
          control.disabled = isDisabled;
        });
      });
    };
    syncDependencies();

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
      setShortcutListeningState(overlay, fieldKey, true, t("shortcuts.pressKey"));
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

    document.addEventListener("keydown", captureShortcutKeydown, true);

    overlay.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach((input) => {
      input.onchange = (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const key = target.getAttribute("data-key");
        if (!isConfigKey(key)) return;
        const value = target.checked;
        ConfigStore.set(key, value);
        this.onConfigChanged(key, value);
        syncDependencies();
      };
    });

    overlay.querySelectorAll<HTMLButtonElement>("[data-au-action]").forEach((button) => {
      button.onclick = () =>
        this.handleDataAction(button.getAttribute("data-au-action"), button);
    });
    // The filter list is re-rendered in place, so these listeners sit on its stable container.
    const filtersPanel = overlay.querySelector<HTMLElement>("[data-au-filters]");
    filtersPanel?.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const path = target?.closest("[data-au-unhide]")?.getAttribute("data-au-unhide");
      if (!path) return;
      FilterStore.unhideSeries(path);
      this.onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
      if (filtersPanel) filtersPanel.innerHTML = this.filtersBodyHTML();
    });
    filtersPanel?.addEventListener("change", (e) => {
      // Checkbox state already matches the stored list, so the genre list is not re-rendered.
      const target = e.target instanceof HTMLInputElement ? e.target : null;
      const name = target?.getAttribute("data-au-genre");
      if (!target || !name) return;
      FilterStore.setGenreExcluded(name, target.checked);
      this.onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
    });

    // Same pattern as the filter list: re-rendered in place (import, clear), so listeners sit on the stable container.
    const historyPanel = overlay.querySelector<HTMLElement>("[data-au-history]");
    const syncHistoryList = () => {
      if (!historyPanel) return;
      const query = (historyPanel.querySelector<HTMLInputElement>("[data-au-history-search]")?.value ?? "")
        .trim()
        .toLowerCase();
      const rows = historyPanel.querySelectorAll<HTMLElement>(".au-history-item");
      let matches = 0;
      rows.forEach((row) => {
        const isMatch = (row.getAttribute("data-au-history-title") ?? "").includes(query);
        row.hidden = !isMatch;
        if (isMatch) matches++;
      });
      const note = historyPanel.querySelector<HTMLElement>("[data-au-history-note]");
      if (!note) return;
      note.textContent =
        rows.length === 0
          ? t("history.empty")
          : matches === 0
            ? t("history.noMatches")
            : "";
      note.hidden = note.textContent === "";
    };
    historyPanel?.addEventListener("input", syncHistoryList);
    historyPanel?.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest("[data-au-history-remove]") ?? null;
      const key = button?.getAttribute("data-au-history-remove");
      if (!button || !key) return;
      HistoryStore.remove(key);
      button.closest(".au-history-item")?.remove();
      syncHistoryList();
      this.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
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
        // A language change rewrites every label in the modal, so it is rendered again in place.
        if (key === "language") this.reopenModal();
      };
    });
  }

  navButtonHTML(page: SettingsPage): string {
    return `
      <button
        type="button"
        class="au-nav-btn"
        id="au-nav-${page.key}"
        role="tab"
        aria-controls="au-page-${page.key}"
        aria-selected="false"
        data-au-nav="${page.key}"
      >
        ${PAGE_ICONS[page.key]}
        <span>${escapeHtml(t(page.title))}</span>
      </button>
    `;
  }

  pageHTML(page: SettingsPage, cfg: AppConfig): string {
    return `
      <div
        class="au-page"
        id="au-page-${page.key}"
        role="tabpanel"
        aria-labelledby="au-nav-${page.key}"
        data-au-page="${page.key}"
      >
        <div class="au-page-label">${escapeHtml(t(page.title))}</div>
        ${page.groups.map((group) => this.groupHTML(group, cfg)).join("")}
      </div>
    `;
  }

  groupHTML(group: SettingsGroup, cfg: AppConfig): string {
    const title = group.title ? `<h3 class="au-group-title">${escapeHtml(t(group.title))}</h3>` : "";
    const rows = group.rows
      ? `<div class="au-card">${group.rows.map((row) => this.settingRowHTML(row, cfg)).join("")}</div>`
      : "";
    const checklist = group.checklist
      ? `<div class="au-card au-checklist">${group.checklist.map((item) => this.checklistItemHTML(item, cfg)).join("")}</div>`
      : "";
    const content = group.content ? this.groupContentHTML(group.content, cfg) : "";

    return `
      <section class="au-group" data-au-group>
        ${title}
        ${rows}
        ${checklist}
        ${content}
      </section>
    `;
  }

  settingRowHTML(row: SettingRow, cfg: AppConfig): string {
    const label = t(`setting.${row.key}.label`);
    const hint = t(`setting.${row.key}.tooltip`);
    const safeLabel = escapeHtml(label);
    const value = escapeHtml(String(cfg[row.key]));
    let control: string;

    switch (row.kind) {
      case "toggle":
        control = `
          <label class="au-toggle">
            <input type="checkbox" data-key="${row.key}" aria-label="${safeLabel}" ${cfg[row.key] ? "checked" : ""}>
            <span class="au-slider"></span>
          </label>
        `;
        break;
      case "number": {
        const meta = CONFIG_META[row.key];
        const range = [
          meta?.min !== undefined ? `min="${meta.min}"` : "",
          meta?.max !== undefined ? `max="${meta.max}"` : "",
        ].join(" ");
        control = `<input type="number" class="au-input-num" data-key="${row.key}" aria-label="${safeLabel}" step="${row.step}" ${range} value="${value}">`;
        break;
      }
      case "color":
        control = `<input type="color" class="au-input-color" data-key="${row.key}" aria-label="${safeLabel}" value="${value}">`;
        break;
      case "select": {
        const options = row.options()
          .map((opt) => {
            const selected = String(cfg[row.key]) === opt.value;
            return `<option value="${escapeHtml(opt.value)}" ${selected ? "selected" : ""}>${escapeHtml(opt.label)}</option>`;
          })
          .join("");
        control = `<select class="au-input-select" data-key="${row.key}" aria-label="${safeLabel}">${options}</select>`;
        break;
      }
    }

    return `
      <div class="au-setting-row" data-au-search="${escapeHtml(searchText(`${label} ${hint}`))}" ${dependencyAttrs(row)}>
        <div class="au-setting-text">
          <div class="au-setting-label">${safeLabel}</div>
          <div class="au-setting-hint">${escapeHtml(hint)}</div>
        </div>
        ${control}
      </div>
    `;
  }

  // Checklist items keep the description in a hover tooltip so the grid stays compact.
  checklistItemHTML(item: ChecklistItem, cfg: AppConfig): string {
    const label = t(`setting.${item.key}.label`);
    const hint = t(`setting.${item.key}.tooltip`);
    const safeHint = escapeHtml(hint);
    return `
      <div class="au-check" data-au-search="${escapeHtml(searchText(`${label} ${hint}`))}" ${dependencyAttrs(item)}>
        <label class="au-check-main">
          <input type="checkbox" data-key="${item.key}" aria-description="${safeHint}" ${cfg[item.key] ? "checked" : ""}>
          <span>${escapeHtml(label)}</span>
        </label>
        <span class="au-control-label" data-tooltip="${safeHint}">
          <span class="au-control-tooltip" aria-hidden="true">?</span>
        </span>
      </div>
    `;
  }

  groupContentHTML(content: GroupContent, cfg: AppConfig): string {
    switch (content) {
      case "history":
        return `
          ${this.dataActionsHTML([
            ["export-history", "data.exportHistory"],
            ["import-history", "data.importHistory"],
            ["clear-history", "data.clearHistory", true],
          ])}
          <div class="au-group-extra" data-au-history>${this.historyBodyHTML()}</div>
        `;
      case "filters":
        return `<div class="au-group-extra" data-au-filters>${this.filtersBodyHTML()}</div>`;
      case "shortcuts":
        return renderShortcutsEditor(cfg);
      case "settingsData":
        return `
          <div class="au-data-note au-group-extra">${escapeHtml(t("data.note"))}</div>
          ${this.dataActionsHTML([
            ["export", "data.exportSettings"],
            ["import", "data.importSettings"],
            ["reset", "data.reset", true],
          ])}
        `;
    }
  }

  // The button labels double as the search text, so "export" or "reset" finds these actions.
  dataActionsHTML(
    actions: readonly (readonly [action: string, label: MessageKey, danger?: boolean])[]
  ): string {
    const labels = actions.map(([, label]) => t(label));
    const buttons = actions
      .map(([action, label, danger]) => `
        <button type="button" class="au-data-btn${danger ? " au-data-btn-danger" : ""}" data-au-action="${action}">${escapeHtml(t(label))}</button>
      `)
      .join("");
    return `<div class="au-data-actions" data-au-search="${escapeHtml(searchText(labels.join(" ")))}">${buttons}</div>`;
  }

  historyBodyHTML(): string {
    const now = Date.now();
    const entries = Object.entries(HistoryStore.load()).sort(
      ([, a], [, b]) => b.lastTs - a.lastTs
    );
    const rowsHTML = entries
      .map(([key, entry]) => {
        const title = entry.title || key;
        const progress = entry.lastProgress >= COMPLETED_THRESHOLD ? t("history.finished") : formatPercent(entry.lastProgress);
        const meta = [chapterSlugToLabel(entry.lastChapter), progress, formatHistoryAge(entry.lastTs, now)]
          .filter(Boolean)
          .map((part) => escapeHtml(part))
          .join(" &bull; ");
        return `
          <li class="au-history-item" data-au-history-title="${escapeHtml(title.toLowerCase())}">
            <div class="au-history-info">
              <div class="au-history-title-row">
                <a class="au-history-title" href="${escapeHtml(entry.lastHref)}">${escapeHtml(title)}</a>
                ${key.startsWith("novel:") ? `<span class="au-history-tag">${escapeHtml(t("history.novelTag"))}</span>` : ""}
              </div>
              <div class="au-history-meta">
                <span>${meta}</span>
                <span>${escapeHtml(tPlural("history.readCount", entry.read.length))}</span>
              </div>
            </div>
            <button type="button" class="au-data-btn" data-au-history-remove="${escapeHtml(key)}">${escapeHtml(t("history.remove"))}</button>
          </li>
        `;
      })
      .join("");

    return `
      <input type="search" class="au-history-search" placeholder="${escapeHtml(t("history.search"))}" aria-label="${escapeHtml(t("history.searchLabel"))}" data-au-history-search>
      <div class="au-data-note" data-au-history-note ${entries.length === 0 ? "" : "hidden"}>${escapeHtml(t("history.empty"))}</div>
      <ul class="au-history-list">${rowsHTML}</ul>
    `;
  }

  refreshHistoryPanel(): void {
    const panel = document.querySelector<HTMLElement>("#au-modal [data-au-history]");
    if (panel) panel.innerHTML = this.historyBodyHTML();
  }

  filtersBodyHTML(): string {
    const hidden = FilterStore.listHidden();
    const excluded = new Set(FilterStore.listExcludedGenres().map((name) => name.toLowerCase()));
    const genres = FilterStore.listGenreNames().sort((a, b) => a.localeCompare(b));

    const hiddenHTML =
      hidden.length === 0
        ? `<div class="au-data-note">${escapeHtml(t("filters.noHidden"))}</div>`
        : `<ul class="au-filter-list">${hidden
            .map(
              (series) => `
                <li class="au-filter-item">
                  <span class="au-filter-name">${escapeHtml(series.title)}</span>
                  <button type="button" class="au-data-btn" data-au-unhide="${escapeHtml(series.path)}">${escapeHtml(t("filters.unhide"))}</button>
                </li>
              `
            )
            .join("")}</ul>`;

    const genreHTML = genres
      .map(
        (name) => `
          <label class="au-filter-genre">
            <input type="checkbox" data-au-genre="${escapeHtml(name)}" ${excluded.has(name.toLowerCase()) ? "checked" : ""}>
            <span>${escapeHtml(name)}</span>
          </label>
        `
      )
      .join("");

    return `
      <div class="au-filter-heading">${escapeHtml(t("filters.hiddenHeading"))}</div>
      ${hiddenHTML}
      <div class="au-filter-heading">${escapeHtml(t("filters.genresHeading"))}</div>
      <div class="au-data-note">${escapeHtml(t("filters.genresNote"))}</div>
      <div class="au-filter-genres">${genreHTML}</div>
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
    this.onConfigChanged("language", ConfigStore.get("language"));
  }

  copyJsonToClipboard(json: string, promptLabel: string, button: HTMLButtonElement): void {
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      clipboard
        .writeText(json)
        .then(() => this.buttonFeedback(button, t("feedback.copied")))
        .catch(() => window.prompt(promptLabel, json));
    } else {
      window.prompt(promptLabel, json);
    }
  }

  handleDataAction(action: string | null, button: HTMLButtonElement): void {
    if (action === "export") {
      this.copyJsonToClipboard(
        JSON.stringify(ConfigStore.getAll(), null, 2),
        t("data.promptCopySettings"),
        button
      );
      return;
    }

    if (action === "export-history") {
      const json = JSON.stringify({ version: 1, history: HistoryStore.load() }, null, 2);
      this.copyJsonToClipboard(json, t("data.promptCopyHistory"), button);
      return;
    }

    if (action === "import-history") {
      const raw = window.prompt(t("data.promptPasteHistory"));
      if (!raw) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.buttonFeedback(button, t("feedback.invalidJson"));
        return;
      }
      const count = HistoryStore.importEntries(parsed);
      if (count === 0) {
        this.buttonFeedback(button, t("feedback.invalidJson"));
        return;
      }
      this.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
      this.refreshHistoryPanel();
      this.buttonFeedback(button, t("feedback.importedHistory", { count }));
      return;
    }

    if (action === "import") {
      const raw = window.prompt(t("data.promptPasteSettings"));
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("not an object");
        }
        this.applyImportedConfig(parsed as Record<string, unknown>);
        this.buttonFeedback(button, t("feedback.importedSettings"));
        this.reopenModal();
      } catch {
        this.buttonFeedback(button, t("feedback.invalidJson"));
      }
      return;
    }

    if (action === "reset") {
      if (!window.confirm(t("data.confirmReset"))) return;
      Object.keys(DEFAULTS).forEach((key) => {
        if (!isConfigKey(key)) return;
        ConfigStore.set(key, DEFAULTS[key]);
      });
      this.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
      this.onConfigChanged("language", ConfigStore.get("language"));
      this.reopenModal();
      return;
    }

    if (action === "clear-history") {
      if (!window.confirm(t("data.confirmClearHistory"))) return;
      HistoryStore.clear();
      this.refreshHistoryPanel();
      this.buttonFeedback(button, t("feedback.cleared"));
    }
  }
}
