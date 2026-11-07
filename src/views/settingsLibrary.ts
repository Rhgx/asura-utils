import { ConfigStore } from "../store/configStore.js";
import { FilterStore } from "../store/filterStore.js";
import {
  COMPLETED_THRESHOLD,
  HistoryStore,
  chapterSlugToLabel,
  formatHistoryAge,
} from "../store/historyStore.js";
import { formatPercent, t, tPlural } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import type { SettingsWindow } from "./settingsWindow.js";

export function historyBodyHTML(): string {
  const now = Date.now();
  const entries = Object.entries(HistoryStore.load()).sort(
    ([, a], [, b]) => b.lastTs - a.lastTs
  );
  const rowsHTML = entries
    .map(([key, entry]) => {
      const title = entry.title || key;
      const progress = entry.lastProgress >= COMPLETED_THRESHOLD ? t("history.finished") : formatPercent(entry.lastProgress);
      const meta = [
        chapterSlugToLabel(entry.lastChapter),
        progress,
        formatHistoryAge(entry.lastTs, now),
        tPlural("history.readCount", entry.read.length),
      ]
        .filter(Boolean)
        .map((part) => escapeHtml(part))
        .join(" &bull; ");
      return `
        <li class="au-history-item" data-au-history-title="${escapeHtml(title.toLowerCase())}">
          <div class="au-history-info">
            <div class="au-history-title-row">
              <a class="au-history-title" href="${escapeHtml(entry.lastHref)}" title="${escapeHtml(title)}">${escapeHtml(title)}</a>
              ${key.startsWith("novel:") ? `<span class="au-history-tag">${escapeHtml(t("history.novelTag"))}</span>` : ""}
            </div>
            <div class="au-history-meta">
              <span>${meta}</span>
            </div>
          </div>
          <button type="button" class="au-data-btn" data-au-history-remove="${escapeHtml(key)}" aria-label="${escapeHtml(t("history.removeLabel", { title }))}">${escapeHtml(t("history.remove"))}</button>
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

export function filtersBodyHTML(): string {
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
                <span class="au-filter-name" title="${escapeHtml(series.title)}">${escapeHtml(series.title)}</span>
                <button type="button" class="au-data-btn" data-au-unhide="${escapeHtml(series.path)}" aria-label="${escapeHtml(t("filters.unhideLabel", { title: series.title }))}">${escapeHtml(t("filters.unhide"))}</button>
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
    <div class="au-filter-heading" id="au-filter-genres-heading">${escapeHtml(t("filters.genresHeading"))}</div>
    <div class="au-data-note">${escapeHtml(t("filters.genresNote"))}</div>
    <div class="au-filter-genres" role="group" aria-labelledby="au-filter-genres-heading">${genreHTML}</div>
  `;
}

function syncHistoryList(panel: HTMLElement): void {
  const query = (panel.querySelector<HTMLInputElement>("[data-au-history-search]")?.value ?? "")
    .trim()
    .toLowerCase();
  const rows = panel.querySelectorAll<HTMLElement>(".au-history-item");
  let matches = 0;
  rows.forEach((row) => {
    const isMatch = (row.getAttribute("data-au-history-title") ?? "").includes(query);
    row.hidden = !isMatch;
    if (isMatch) matches++;
  });
  const note = panel.querySelector<HTMLElement>("[data-au-history-note]");
  if (!note) return;
  note.textContent =
    rows.length === 0
      ? t("history.empty")
      : matches === 0
        ? t("history.noMatches")
        : "";
  note.hidden = note.textContent === "";
}

// Other sections change history too (import, clear), and the list is rebuilt to show it.
export function refreshHistoryPanel(overlay: ParentNode): void {
  const panel = overlay.querySelector<HTMLElement>("[data-au-history]");
  if (!panel) return;
  // Rebuilding the list must not lose what the user has typed into its search box.
  const query = panel.querySelector<HTMLInputElement>("[data-au-history-search]")?.value ?? "";
  panel.innerHTML = historyBodyHTML();
  const search = panel.querySelector<HTMLInputElement>("[data-au-history-search]");
  if (search) search.value = query;
  syncHistoryList(panel);
}

function bindHistoryPanel(win: SettingsWindow, panel: HTMLElement): void {
  const notifyChanged = () => win.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));

  panel.addEventListener("input", () => syncHistoryList(panel));
  panel.addEventListener("keydown", (e) => {
    const target = e.target;
    if (e.key !== "Escape" || !(target instanceof HTMLInputElement) || target.value === "") return;
    e.preventDefault();
    target.value = "";
    syncHistoryList(panel);
  });
  panel.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const button = target?.closest("[data-au-history-remove]") ?? null;
    const key = button?.getAttribute("data-au-history-remove");
    if (!button || !key) return;
    const entry = HistoryStore.load()[key];
    const visibleRows = Array.from(panel.querySelectorAll<HTMLElement>(".au-history-item:not([hidden])"));
    const row = button.closest<HTMLElement>(".au-history-item");
    const rowIndex = row ? visibleRows.indexOf(row) : -1;
    const neighbor = visibleRows[rowIndex + 1] ?? visibleRows[rowIndex - 1];
    HistoryStore.remove(key);
    row?.remove();
    syncHistoryList(panel);
    notifyChanged();
    // The button that had focus is gone, so focus moves to the next row or the search box.
    (neighbor?.querySelector<HTMLElement>("[data-au-history-remove]") ??
      panel.querySelector<HTMLElement>("[data-au-history-search]"))?.focus();
    if (entry) {
      win.status.show(t("feedback.removedSeries", { title: entry.title || key }), () => {
        HistoryStore.restore(key, entry);
        refreshHistoryPanel(win.overlay);
        notifyChanged();
        return panel.querySelector<HTMLElement>(`[data-au-history-remove="${CSS.escape(key)}"]`);
      });
    }
  });
}

function bindFiltersPanel(win: SettingsWindow, panel: HTMLElement): void {
  const notifyChanged = () => win.onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
  const refresh = () => {
    panel.innerHTML = filtersBodyHTML();
    notifyChanged();
  };

  panel.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const path = target?.closest("[data-au-unhide]")?.getAttribute("data-au-unhide");
    if (!path) return;
    const hidden = FilterStore.listHidden();
    const index = hidden.findIndex((item) => item.path === path);
    const series = hidden[index];
    FilterStore.unhideSeries(path);
    refresh();
    // The button that had focus is gone, so focus moves to its neighbor or the next control.
    const buttons = panel.querySelectorAll<HTMLElement>("[data-au-unhide]");
    (buttons[Math.min(index, buttons.length - 1)] ?? panel.querySelector<HTMLElement>("input"))?.focus();
    if (series) {
      win.status.show(t("feedback.unhidSeries", { title: series.title }), () => {
        FilterStore.hideSeries(series);
        refresh();
        return panel.querySelector<HTMLElement>(`[data-au-unhide="${CSS.escape(series.path)}"]`);
      });
    }
  });
  panel.addEventListener("change", (e) => {
    // Checkbox state already matches the stored list, so the genre list is not re-rendered.
    const target = e.target instanceof HTMLInputElement ? e.target : null;
    const name = target?.getAttribute("data-au-genre");
    if (!target || !name) return;
    FilterStore.setGenreExcluded(name, target.checked);
    notifyChanged();
  });
}

// Both lists re-render in place, so their listeners sit on the stable containers.
export function bindLibraryPanels(win: SettingsWindow): void {
  const historyPanel = win.overlay.querySelector<HTMLElement>("[data-au-history]");
  const filtersPanel = win.overlay.querySelector<HTMLElement>("[data-au-filters]");
  if (historyPanel) bindHistoryPanel(win, historyPanel);
  if (filtersPanel) bindFiltersPanel(win, filtersPanel);
}
