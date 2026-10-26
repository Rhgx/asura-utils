import { ConfigStore } from "../store/configStore.js";
import { FilterStore } from "../store/filterStore.js";
import { t } from "../i18n/index.js";
import type { PageControllerContext } from "./types.js";
import {
  extractSeriesGenres,
  hasExcludedGenre,
  isFilterListingPath,
  isSeriesCardPath,
  seriesPathOf,
} from "./seriesFilterLogic.js";
import type { GenreCache, SeriesGenres } from "./seriesFilterLogic.js";

const HIDDEN_CLASS = "au-filtered-series";
const HOST_CLASS = "au-hide-series-host";
const BUTTON_CLASS = "au-hide-series-btn";
const SERIES_LINK_SELECTOR = 'a[href*="/comics/"], a[href*="/novels/"]';
// Home cards use alt="poster" on the cover, which is not a title.
const GENERIC_ALT = "poster";
// Same close icon as the settings modal.
const BUTTON_ICON =
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

// Remembers the props string last learned per island, so each island is parsed only when its props change.
const learnedProps = new WeakMap<Element, string>();

function collectNewSeriesGenres(root: Document): SeriesGenres[] {
  const learned: SeriesGenres[] = [];
  root.querySelectorAll("astro-island[props]").forEach((island) => {
    const props = island.getAttribute("props") || "";
    if (learnedProps.get(island) === props) return;
    learnedProps.set(island, props);
    if (!props.includes("genres")) return;
    learned.push(...extractSeriesGenres(props));
  });
  return learned;
}

function listingSeriesAnchors(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>(SERIES_LINK_SELECTOR)).filter(
    (anchor) => isSeriesCardPath(anchor.pathname) && !anchor.closest("header, [id^='au-']")
  );
}

// Coverless links into the other section (a comic row's "Read the Novel" link) are promos inside the card,
// not another card. Cards always have a cover, so climbing from a promo link stops at the promo itself.
function containsOnlySeries(root: Element, path: string): boolean {
  const section = path.slice(0, path.indexOf("/", 1) + 1);
  return Array.from(root.querySelectorAll<HTMLAnchorElement>(SERIES_LINK_SELECTOR)).every(
    (anchor) => {
      const linked = seriesPathOf(anchor.pathname);
      if (linked === null || linked === path) return true;
      return !linked.startsWith(section) && !anchor.querySelector("img");
    }
  );
}

// Climbs while the parent holds only this series, so the last such element is the whole card.
function findSeriesCard(anchor: HTMLAnchorElement, path: string): Element {
  let card: Element = anchor;
  let parent = anchor.parentElement;
  while (parent && !parent.matches("main, body, astro-island") && containsOnlySeries(parent, path)) {
    card = parent;
    parent = parent.parentElement;
  }
  return card;
}

function seriesTitle(anchor: HTMLAnchorElement, path: string): string {
  const alt = anchor.querySelector("img")?.alt.trim();
  if (alt && alt !== GENERIC_ALT) return alt;
  const text = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
  return text || path.slice(path.lastIndexOf("/") + 1);
}

// Only touches the DOM when something differs, because run() is triggered by DOM mutations.
function syncHideButtons(covers: ReadonlySet<HTMLAnchorElement>): void {
  document.querySelectorAll<HTMLAnchorElement>(`a.${HOST_CLASS}`).forEach((anchor) => {
    if (covers.has(anchor)) return;
    anchor.querySelectorAll(`:scope > .${BUTTON_CLASS}`).forEach((button) => button.remove());
    anchor.classList.remove(HOST_CLASS);
  });

  covers.forEach((anchor) => {
    if (!anchor.classList.contains(HOST_CLASS)) anchor.classList.add(HOST_CLASS);
    if (anchor.querySelector(`:scope > .${BUTTON_CLASS}`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.title = t("filters.hideSeries");
    button.innerHTML = BUTTON_ICON;
    anchor.appendChild(button);
  });
}

function syncFilteredCards(cards: ReadonlySet<Element>): void {
  document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => {
    if (!cards.has(card)) card.classList.remove(HIDDEN_CLASS);
  });
  cards.forEach((card) => card.classList.add(HIDDEN_CLASS));
}

export const seriesFilterController = {
  applySeriesFilters() {
    // Learning runs on every page, since props carry series genres everywhere; it only writes new entries.
    const learned = collectNewSeriesGenres(document);
    if (learned.length > 0) FilterStore.learnSeriesGenres(learned);

    const active =
      ConfigStore.get("seriesFilters") && isFilterListingPath(window.location.pathname);
    if (!active) {
      syncHideButtons(new Set<HTMLAnchorElement>());
      syncFilteredCards(new Set<Element>());
      return;
    }

    const hidden = new Set(FilterStore.listHidden().map((series) => series.path));
    const excluded = FilterStore.listExcludedGenres();
    // The cache can hold thousands of entries, so it is only read when a genre is excluded.
    const genreCache: GenreCache = excluded.length > 0 ? FilterStore.getGenreCache() : {};
    const covers = new Set<HTMLAnchorElement>();
    const cards = new Set<Element>();

    for (const anchor of listingSeriesAnchors()) {
      if (anchor.querySelector("img")) covers.add(anchor);
      const path = anchor.pathname;
      if (hidden.has(path) || hasExcludedGenre(genreCache[path] ?? [], excluded)) {
        cards.add(findSeriesCard(anchor, path));
      }
    }

    syncHideButtons(covers);
    syncFilteredCards(cards);
  },

  handleSeriesHideClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest(`.${BUTTON_CLASS}`);
    const anchor = button?.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || !isSeriesCardPath(anchor.pathname)) return;

    // The button sits inside the card link, so stop the click before the site follows the link.
    event.preventDefault();
    event.stopPropagation();

    const path = anchor.pathname;
    const title = seriesTitle(anchor, path);
    FilterStore.hideSeries({ path, title });
    this.applySeriesFilters();
    this.showHint(t("hint.hidden", { title }));
  },
} satisfies ThisType<PageControllerContext>;
