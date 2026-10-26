import { parseIslandProps, unwrapProp } from "./chapterProps.js";

// Kept free of ConfigStore and other GM-backed imports so the unit tests can load this module.

const MAX_GENRE_CACHE_ENTRIES = 3000;
const MAX_GENRE_NAMES = 300;

// Lowercased genre names per series path, e.g. "/comics/overgeared-3ebcc5a9": ["action", "fantasy"].
export type GenreCache = Record<string, string[]>;

export interface SeriesGenres {
  path: string;
  genres: string[];
}

const SERIES_PATH_PATTERN = /^\/(comics|novels)\/[^/?#]+$/;
const SERIES_OR_CHAPTER_PATTERN = /^(\/(?:comics|novels)\/[^/?#]+)(?:\/chapter\/[^/?#]+)?$/;
// Home (/, /comics, /novels, and their /page/... variants) and browse pages only.
const LISTING_PATH_PATTERN = /^\/(?:(?:comics|novels)\/?)?(?:page\/[^/]+\/?)?$|^\/browse(?:\/|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSeriesCardPath(pathname: string): boolean {
  return SERIES_PATH_PATTERN.test(pathname);
}

// Chapter links map to the series they belong to, so "/comics/x/chapter/5" gives "/comics/x".
export function seriesPathOf(pathname: string): string | null {
  return SERIES_OR_CHAPTER_PATTERN.exec(pathname)?.[1] ?? null;
}

export function isFilterListingPath(pathname: string): boolean {
  return LISTING_PATH_PATTERN.test(pathname);
}

// Comic items carry public_url; novel items only carry a slug, so their path is rebuilt from it.
function seriesPathFromRecord(record: Record<string, unknown>): string | null {
  const publicUrl = unwrapProp(record["public_url"]);
  if (typeof publicUrl === "string" && isSeriesCardPath(publicUrl)) return publicUrl;

  const slug = unwrapProp(record["slug"]);
  if (typeof slug === "string" && /^[^/?#\s]+$/.test(slug)) return `/novels/${slug}`;
  return null;
}

// Comic genres are objects like {name, slug, id}; novel genres are plain names. Both arrive wrapped as [0, value].
function genreName(item: unknown): string | null {
  const value = unwrapProp(item);
  if (typeof value === "string") return value.trim() || null;
  if (!isRecord(value)) return null;
  const name = unwrapProp(value["name"]);
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function genreNamesFromProp(raw: unknown): string[] | null {
  const items = unwrapProp(raw);
  if (!Array.isArray(items)) return null;
  const names: string[] = [];
  for (const item of items) {
    const name = genreName(item);
    if (name) names.push(name);
  }
  return names;
}

function collectSeriesGenres(node: unknown, found: SeriesGenres[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectSeriesGenres(item, found);
    return;
  }
  if (!isRecord(node)) return;

  const path = seriesPathFromRecord(node);
  if (path !== null) {
    const genres = genreNamesFromProp(node["genres"]);
    if (genres) found.push({ path, genres });
  }
  // Series can nest inside other records (e.g. a list inside a section), so keep walking.
  for (const value of Object.values(node)) collectSeriesGenres(value, found);
}

export function extractSeriesGenres(props: string): SeriesGenres[] {
  const found: SeriesGenres[] = [];
  const parsed = parseIslandProps(props);
  if (parsed) collectSeriesGenres(parsed, found);
  return found;
}

// Excluded names are compared case-insensitively, so "action" also excludes "Action".
export function hasExcludedGenre(genres: readonly string[], excluded: readonly string[]): boolean {
  if (genres.length === 0 || excluded.length === 0) return false;
  const excludedKeys = new Set(excluded.map((name) => name.toLowerCase()));
  return genres.some((genre) => excludedKeys.has(genre.toLowerCase()));
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// Returns the merged cache, or null when every update already matches so callers can skip the write.
// Re-learned series move to the newest position, and the oldest insertions are dropped past the cap.
export function mergeGenreCache(
  cache: GenreCache,
  updates: readonly SeriesGenres[]
): GenreCache | null {
  let next: GenreCache | null = null;
  for (const { path, genres } of updates) {
    const lowered = genres.map((genre) => genre.toLowerCase());
    const current = (next ?? cache)[path];
    if (current && sameStrings(current, lowered)) continue;

    next ??= { ...cache };
    delete next[path];
    next[path] = lowered;
  }
  if (!next) return null;

  const paths = Object.keys(next);
  for (const path of paths.slice(0, Math.max(0, paths.length - MAX_GENRE_CACHE_ENTRIES))) {
    delete next[path];
  }
  return next;
}

// Adds names that are not already known (case-insensitively). Returns null when nothing is new.
export function mergeGenreNames(names: readonly string[], incoming: readonly string[]): string[] | null {
  const known = new Set(names.map((name) => name.toLowerCase()));
  const next = [...names];
  for (const name of incoming) {
    const key = name.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    next.push(name);
  }
  if (next.length === names.length) return null;
  return next.slice(-MAX_GENRE_NAMES);
}
