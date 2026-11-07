import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type { SettingsPageKey } from "../config/settingsLayout.js";
import { t, tPlural } from "../i18n/index.js";
import { escapeHtml } from "./escapeHtml.js";
import { PAGE_ICONS } from "./settingsIcons.js";
import { matchesSearch, searchText } from "./settingsSearch.js";
import type { SettingsWindow } from "./settingsWindow.js";

// Like T3 Code, a search swaps the section list for matching settings from every section.
export function bindSearchBox(win: SettingsWindow): void {
  const { overlay } = win;
  const content = overlay.querySelector<HTMLElement>("[data-au-content]");
  const navList = overlay.querySelector<HTMLElement>("[data-au-nav-list]");
  const searchInput = overlay.querySelector<HTMLInputElement>("[data-au-search-input]");
  const searchClear = overlay.querySelector<HTMLButtonElement>("[data-au-search-clear]");
  const searchResults = overlay.querySelector<HTMLElement>("[data-au-search-results]");
  const searchCount = overlay.querySelector<HTMLElement>("[data-au-search-count]");
  const pageTitles = new Map(SETTINGS_PAGES.map((page) => [page.key, t(page.title)]));

  // Every searchable item, indexed once. The lists that re-render in place hold no searchable items.
  const searchIndex = Array.from(content?.querySelectorAll<HTMLElement>("[data-au-search]") ?? []).flatMap((el) => {
    const pageKey = el.closest("[data-au-page]")?.getAttribute("data-au-page");
    const page = SETTINGS_PAGES.find((candidate) => candidate.key === pageKey);
    if (!page) return [];
    const label = el.getAttribute("data-au-label") ?? "";
    return [{ el, page, label, labelText: searchText(label), text: el.getAttribute("data-au-search") ?? "" }];
  });
  let searchMatches: typeof searchIndex = [];
  let activeResult = -1;
  // Browsing results only previews them, so clearing the search goes back to where the user was.
  let pageBeforeSearch: SettingsPageKey | null = null;

  const clearPreview = () => {
    content?.querySelectorAll(".is-preview").forEach((el) => el.classList.remove("is-preview"));
  };

  const markActiveResult = () => {
    searchResults?.querySelectorAll<HTMLElement>("[data-au-result]").forEach((result, index) => {
      const isActive = index === activeResult;
      result.classList.toggle("active", isActive);
      result.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        result.scrollIntoView({ block: "nearest" });
        // Focus stays in the search box, so this is how a screen reader follows the highlighted result.
        searchInput?.setAttribute("aria-activedescendant", result.id);
      }
    });
    if (activeResult < 0) searchInput?.removeAttribute("aria-activedescendant");
  };

  // The highlighted result is always the one on screen, so results can be judged without opening each one.
  const previewResult = (index: number) => {
    const match = searchMatches[index];
    if (!match) return;
    activeResult = index;
    markActiveResult();
    win.showPage(match.page.key);
    clearPreview();
    match.el.classList.add("is-preview");
    match.el.scrollIntoView({ block: "center" });
  };

  // Opening a result also points at the setting and moves focus to its control; the results stay listed.
  const openResult = (index: number) => {
    const match = searchMatches[index];
    if (!match) return;
    previewResult(index);
    pageBeforeSearch = null;
    clearPreview();
    match.el.classList.remove("is-flash");
    // Reading layout restarts the highlight animation when the same result is opened twice.
    void match.el.offsetWidth;
    match.el.classList.add("is-flash");
    window.setTimeout(() => match.el.classList.remove("is-flash"), 1200);
    const control = match.el.matches("button")
      ? match.el
      : match.el.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), button:not(:disabled)");
    control?.focus({ preventScroll: true });
  };

  // Matches on the setting name are listed before matches found only in a description.
  const applySearch = (query: string) => {
    const trimmed = query.trim();
    const isSearching = trimmed !== "";
    if (navList) navList.hidden = isSearching;
    if (searchClear) searchClear.hidden = query === "";
    if (!searchResults) return;
    searchResults.hidden = !isSearching;
    searchInput?.setAttribute("aria-expanded", isSearching ? "true" : "false");
    if (!isSearching) {
      searchResults.innerHTML = "";
      searchMatches = [];
      activeResult = -1;
      markActiveResult();
      clearPreview();
      if (searchCount) searchCount.textContent = "";
      if (pageBeforeSearch) win.showPage(pageBeforeSearch);
      pageBeforeSearch = null;
      return;
    }
    pageBeforeSearch ??= win.getActivePage();

    searchMatches = searchIndex
      .filter((item) => matchesSearch(item.text, trimmed))
      .sort((a, b) => Number(matchesSearch(b.labelText, trimmed)) - Number(matchesSearch(a.labelText, trimmed)));
    activeResult = searchMatches.length > 0 ? 0 : -1;
    if (searchCount) {
      searchCount.textContent =
        searchMatches.length === 0 ? t("settings.noResults") : tPlural("settings.resultCount", searchMatches.length);
    }
    searchResults.innerHTML =
      searchMatches.length === 0
        ? `<div class="au-search-empty">${escapeHtml(t("settings.noResults"))}</div>`
        : searchMatches
            .map((match, index) => `
              <button type="button" class="au-result" id="au-result-${index}" role="option" aria-selected="false" tabindex="-1" data-au-result="${index}">
                ${PAGE_ICONS[match.page.key]}
                <span class="au-result-text">
                  <span class="au-result-label">${escapeHtml(match.label)}</span>
                  <span class="au-result-page">${escapeHtml(pageTitles.get(match.page.key) ?? "")}</span>
                </span>
              </button>
            `)
            .join("");
    // A message is not a valid listbox child, so the role only applies while there are options.
    if (searchMatches.length === 0) searchResults.removeAttribute("role");
    else searchResults.setAttribute("role", "listbox");
    if (activeResult >= 0) previewResult(activeResult);
    else {
      clearPreview();
      markActiveResult();
    }
  };

  const clearSearch = () => {
    if (!searchInput || searchInput.value === "") return;
    searchInput.value = "";
    applySearch("");
  };

  searchInput?.addEventListener("input", () => applySearch(searchInput.value));
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchInput.value !== "") {
      e.preventDefault();
      clearSearch();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && searchMatches.length > 0) {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      previewResult((activeResult + step + searchMatches.length) % searchMatches.length);
    } else if (e.key === "Enter" && activeResult >= 0) {
      e.preventDefault();
      openResult(activeResult);
    }
  });
  searchClear?.addEventListener("click", () => {
    clearSearch();
    searchInput?.focus();
  });
  searchResults?.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const index = target?.closest("[data-au-result]")?.getAttribute("data-au-result");
    if (index) openResult(Number(index));
  });
}
