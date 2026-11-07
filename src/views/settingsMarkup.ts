import packageJson from "../../package.json";
import { CONFIG_META } from "../config/defaults.js";
import type { AppConfig } from "../config/defaults.js";
import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type {
  GroupContent,
  PaletteOption,
  SettingRow,
  SettingsGroup,
  SettingsPage,
} from "../config/settingsLayout.js";
import { t } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import { dataActionsHTML, importPanelHTML } from "./settingsData.js";
import { CHEVRON_ICON, CLEAR_ICON, PAGE_ICONS, SEARCH_ICON, rocksEmblemSvg } from "./settingsIcons.js";
import { filtersBodyHTML, historyBodyHTML } from "./settingsLibrary.js";
import { searchText } from "./settingsSearch.js";
import { renderShortcutsEditor } from "./settingsShortcuts.js";

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

function creditsHTML(extraClass = ""): string {
  return `
    <footer class="au-credits ${extraClass}">
      <a class="au-credits-link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">
        <span class="au-credits-avatar">${rocksEmblemSvg}</span>
        ${escapeHtml(t("settings.madeBy", { author: AUTHOR_NAME }))}
      </a>
      <span class="au-credits-version">
        <a class="au-credits-link" href="${RELEASES_URL}" target="_blank" rel="noopener noreferrer">v${APP_VERSION}</a>
      </span>
    </footer>
  `;
}

function navButtonHTML(page: SettingsPage): string {
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

function settingControlHTML(row: SettingRow, cfg: AppConfig): string {
  const value = escapeHtml(String(cfg[row.key]));
  const controlId = `au-setting-${row.key}`;
  const labelId = `${controlId}-label`;
  const hintId = `${controlId}-hint`;
  const names = `aria-labelledby="${labelId}" aria-describedby="${hintId}"`;

  switch (row.kind) {
    case "toggle":
      return `
        <span class="au-toggle">
          <input type="checkbox" role="switch" id="${controlId}" data-key="${row.key}" ${names} ${cfg[row.key] ? "checked" : ""}>
          <span class="au-slider"></span>
        </span>
      `;
    case "number": {
      const meta = CONFIG_META[row.key];
      const range = [
        meta?.min !== undefined ? `min="${meta.min}"` : "",
        meta?.max !== undefined ? `max="${meta.max}"` : "",
      ].join(" ");
      return `<input type="number" class="au-input-num" id="${controlId}" data-key="${row.key}" ${names} step="${row.step}" ${range} value="${value}">`;
    }
    case "color":
      return `<input type="color" class="au-input-color" id="${controlId}" data-key="${row.key}" ${names} value="${value}">`;
    case "select": {
      const options = row.options()
        .map((opt) => {
          const selected = String(cfg[row.key]) === opt.value;
          return `<option value="${escapeHtml(opt.value)}" ${selected ? "selected" : ""}>${escapeHtml(opt.label)}</option>`;
        })
        .join("");
      return `<select class="au-input-select" id="${controlId}" data-key="${row.key}" ${names}>${options}</select>`;
    }
    case "palette": {
      const options = row.options();
      const selected = options.find((opt) => opt.value === String(cfg[row.key])) ?? options[0];
      const currentId = `${controlId}-current`;
      const optionBody = (opt: PaletteOption) => `
        <span class="au-swatches" aria-hidden="true">
          ${opt.swatches.map((color) => `<span class="au-swatch" data-au-swatch="${escapeHtml(color)}"></span>`).join("")}
        </span>
        <span class="au-palette-name">${escapeHtml(opt.label)}</span>
      `;
      return `
        <div class="au-palette" data-au-palette data-key="${row.key}">
          <button type="button" class="au-palette-trigger" id="${controlId}" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${labelId} ${currentId}" aria-describedby="${hintId}">
            <span class="au-palette-current" id="${currentId}">${selected ? optionBody(selected) : ""}</span>
            ${CHEVRON_ICON}
          </button>
          <div class="au-palette-menu" role="listbox" aria-labelledby="${labelId}" hidden>
            ${options
              .map((opt) => `
                <div
                  class="au-palette-option"
                  role="option"
                  tabindex="-1"
                  aria-selected="${opt === selected ? "true" : "false"}"
                  data-au-option="${escapeHtml(opt.value)}"
                >${optionBody(opt)}</div>
              `)
              .join("")}
          </div>
        </div>
      `;
    }
  }
}

function settingRowHTML(row: SettingRow, cfg: AppConfig): string {
  const label = t(`setting.${row.key}.label`);
  const hint = t(`setting.${row.key}.tooltip`);
  const safeLabel = escapeHtml(label);
  const controlId = `au-setting-${row.key}`;
  const keywords = (row.keywords ?? []).map((keyword) => t(keyword));

  // A toggle's whole row is its label, so the description and the empty space are also targets.
  const isToggle = row.kind === "toggle";
  const rowTag = isToggle ? "label" : "div";
  const rowFor = isToggle ? `for="${controlId}"` : "";
  const labelTag = isToggle ? "span" : "label";
  const labelFor = isToggle ? "" : `for="${controlId}"`;

  return `
    <${rowTag} class="au-setting-row${isToggle ? " au-setting-row-toggle" : ""}" ${rowFor} data-au-search="${escapeHtml(searchText([label, hint, ...keywords].join(" ")))}" data-au-label="${safeLabel}" ${dependencyAttrs(row)}>
      <span class="au-setting-text">
        <${labelTag} class="au-setting-label" id="${controlId}-label" ${labelFor}>${safeLabel}</${labelTag}>
        <span class="au-setting-hint" id="${controlId}-hint">${escapeHtml(hint)}</span>
      </span>
      ${settingControlHTML(row, cfg)}
    </${rowTag}>
  `;
}

function groupContentHTML(content: GroupContent, cfg: AppConfig): string {
  switch (content) {
    case "history":
      return `<div data-au-history>${historyBodyHTML()}</div>`;
    case "filters":
      return `<div data-au-filters>${filtersBodyHTML()}</div>`;
    case "shortcuts":
      return renderShortcutsEditor(cfg);
    case "settingsData":
      return `
        <p class="au-data-note">${escapeHtml(t("data.note"))}</p>
        ${dataActionsHTML([
          ["export", "data.exportSettings"],
          ["import", "data.importSettings"],
          ["reset", "data.reset", true],
        ])}
        ${importPanelHTML("import", "data.promptPasteSettings")}
      `;
    case "historyData":
      return `
        <p class="au-data-note">${escapeHtml(t("data.historyNote"))}</p>
        ${dataActionsHTML([
          ["export-history", "data.exportHistory"],
          ["import-history", "data.importHistory"],
          ["clear-history", "data.clearHistory", true],
        ])}
        ${importPanelHTML("import-history", "data.promptPasteHistory")}
      `;
  }
}

function groupHTML(group: SettingsGroup, cfg: AppConfig): string {
  const title = group.title ? `<h3 class="au-group-title">${escapeHtml(t(group.title))}</h3>` : "";
  const rows = group.rows
    ? `<div class="au-card">${group.rows.map((row) => settingRowHTML(row, cfg)).join("")}</div>`
    : "";
  const content = group.content ? groupContentHTML(group.content, cfg) : "";

  return `
    <section class="au-group">
      ${title}
      ${rows}
      ${content}
    </section>
  `;
}

function pageHTML(page: SettingsPage, cfg: AppConfig): string {
  return `
    <div
      class="au-page"
      id="au-page-${page.key}"
      role="tabpanel"
      aria-labelledby="au-nav-${page.key}"
      data-au-page="${page.key}"
    >
      ${page.groups.map((group) => groupHTML(group, cfg)).join("")}
    </div>
  `;
}

export function settingsWindowHTML(cfg: AppConfig): string {
  const navHTML = (pages: readonly SettingsPage[]) => pages.map(navButtonHTML).join("");

  return `
    <div id="au-modal" tabindex="-1">
      <aside class="au-sidebar">
        <div class="au-search">
          ${SEARCH_ICON}
          <input
            type="search"
            class="au-search-input"
            placeholder="${escapeHtml(t("settings.search"))}"
            aria-label="${escapeHtml(t("settings.search"))}"
            role="combobox"
            aria-expanded="false"
            aria-controls="au-search-results"
            aria-autocomplete="list"
            autocomplete="off"
            spellcheck="false"
            data-au-search-input
          >
          <button type="button" class="au-search-clear" aria-label="${escapeHtml(t("settings.clearSearch"))}" data-au-search-clear hidden>
            ${CLEAR_ICON}
          </button>
        </div>
        <nav class="au-nav" role="tablist" aria-orientation="vertical" aria-label="${escapeHtml(t("settings.sections"))}" data-au-nav-list>
          ${navHTML(SETTINGS_PAGES.filter((page) => !page.footer))}
          <div class="au-nav-spacer" aria-hidden="true"></div>
          ${navHTML(SETTINGS_PAGES.filter((page) => page.footer))}
        </nav>
        <div class="au-search-results" id="au-search-results" role="listbox" aria-label="${escapeHtml(t("settings.searchResults"))}" data-au-search-results hidden></div>
        <div class="au-sr-only" role="status" data-au-search-count></div>
        ${creditsHTML()}
      </aside>
      <div class="au-main">
        <div class="au-main-header">
          <h2 class="au-main-title" data-au-main-title></h2>
          <button type="button" class="au-close-btn" aria-label="${escapeHtml(t("settings.close"))}">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <div class="au-content" data-au-content>
          ${SETTINGS_PAGES.map((page) => pageHTML(page, cfg)).join("")}
          ${creditsHTML("au-credits-inline")}
        </div>
        <div class="au-status" role="status" data-au-status>
          <div class="au-status-bar" data-au-status-bar hidden>
            <span class="au-status-text" data-au-status-text></span>
            <button type="button" class="au-status-undo" data-au-status-undo hidden>${escapeHtml(t("feedback.undo"))}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
