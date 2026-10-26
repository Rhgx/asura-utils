import {
  isSeriesCardPath,
  mergeGenreCache,
  mergeGenreNames,
} from "../controllers/seriesFilterLogic.js";
import type { GenreCache, SeriesGenres } from "../controllers/seriesFilterLogic.js";

const HIDDEN_KEY = "filterHiddenSeries";
const EXCLUDED_KEY = "filterExcludedGenres";
const GENRE_CACHE_KEY = "filterGenreCache";
const GENRE_NAMES_KEY = "filterGenreNames";

export interface HiddenSeries {
  path: string;
  title: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Stored values can be hand-edited or left over from older versions, so each entry is checked on load.
function parseHiddenSeries(raw: unknown): HiddenSeries[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const list: HiddenSeries[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const path = item["path"];
    if (typeof path !== "string" || !isSeriesCardPath(path) || seen.has(path)) continue;
    seen.add(path);
    const title = item["title"];
    list.push({ path, title: typeof title === "string" && title.trim() ? title.trim() : path });
  }
  return list;
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const list: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    list.push(name);
  }
  return list;
}

function parseGenreCache(raw: unknown): GenreCache {
  const cache: GenreCache = {};
  if (!isRecord(raw)) return cache;
  for (const [path, genres] of Object.entries(raw)) {
    if (!isSeriesCardPath(path) || !Array.isArray(genres)) continue;
    cache[path] = genres.filter((genre): genre is string => typeof genre === "string");
  }
  return cache;
}

export const FilterStore = {
  listHidden(): HiddenSeries[] {
    return parseHiddenSeries(GM_getValue<unknown>(HIDDEN_KEY, []));
  },

  hideSeries(series: HiddenSeries): void {
    const list = this.listHidden();
    if (list.some((item) => item.path === series.path)) return;
    list.push(series);
    GM_setValue(HIDDEN_KEY, list);
  },

  unhideSeries(path: string): void {
    const list = this.listHidden();
    const next = list.filter((item) => item.path !== path);
    if (next.length === list.length) return;
    GM_setValue(HIDDEN_KEY, next);
  },

  clearHidden(): void {
    GM_setValue(HIDDEN_KEY, []);
  },

  listExcludedGenres(): string[] {
    return parseStringList(GM_getValue<unknown>(EXCLUDED_KEY, []));
  },

  setGenreExcluded(name: string, excluded: boolean): void {
    const list = this.listExcludedGenres();
    const key = name.toLowerCase();
    const isExcluded = list.some((item) => item.toLowerCase() === key);
    if (isExcluded === excluded) return;
    GM_setValue(
      EXCLUDED_KEY,
      excluded ? [...list, name] : list.filter((item) => item.toLowerCase() !== key)
    );
  },

  getGenreCache(): GenreCache {
    return parseGenreCache(GM_getValue<unknown>(GENRE_CACHE_KEY, {}));
  },

  listGenreNames(): string[] {
    return parseStringList(GM_getValue<unknown>(GENRE_NAMES_KEY, []));
  },

  // Called from page runs, so it only writes when a series or genre name is new or changed.
  learnSeriesGenres(entries: readonly SeriesGenres[]): void {
    const cache = mergeGenreCache(this.getGenreCache(), entries);
    if (cache) GM_setValue(GENRE_CACHE_KEY, cache);

    const names = mergeGenreNames(
      this.listGenreNames(),
      entries.flatMap((entry) => entry.genres)
    );
    if (names) GM_setValue(GENRE_NAMES_KEY, names);
  },
};
