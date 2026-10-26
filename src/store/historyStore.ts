import { getLocale, t } from "../i18n/index.js";

const STORAGE_KEY = "readingHistory";
const MAX_SERIES = 150;
export const MAX_READ_CHAPTERS = 600;
export const COMPLETED_THRESHOLD = 90;

export interface ReaderPath {
  seriesSlug: string;
  chapterSlug: string;
}

export interface HistoryEntry {
  title: string;
  lastChapter: string;
  lastHref: string;
  lastTs: number;
  lastProgress: number;
  read: string[];
}

export type ReadingHistory = Record<string, HistoryEntry>;

interface VisitInput extends ReaderPath {
  href: string;
  title: string;
  progress?: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value)) return null;
  const read = Array.isArray(value["read"])
    ? value["read"].filter((chapter): chapter is string => typeof chapter === "string")
    : [];
  return {
    title: typeof value["title"] === "string" ? value["title"] : "",
    lastChapter: typeof value["lastChapter"] === "string" ? value["lastChapter"] : "",
    lastHref: typeof value["lastHref"] === "string" ? value["lastHref"] : "",
    lastTs: Number(value["lastTs"]) || 0,
    lastProgress: Number(value["lastProgress"]) || 0,
    read,
  };
}

// Novel slugs get a prefix so they cannot collide with comic slugs already stored in history.
function historyKey(section: string, slug: string): string {
  return section === "novels" ? `novel:${slug}` : slug;
}

function parseReaderPath(path: unknown): ReaderPath | null {
  const match = String(path || "").match(
    /^\/(comics|series|novels)\/([^/?#]+)\/chapter\/([^/?#]+)/
  );
  if (!match) return null;
  return { seriesSlug: historyKey(match[1]!, match[2]!), chapterSlug: match[3]! };
}

function parseSeriesPath(path: unknown): string {
  const match = String(path || "").match(/^\/(comics|series|novels)\/([^/?#]+)\/?$/);
  if (!match) return "";
  return historyKey(match[1]!, match[2]!);
}

function chapterSlugToLabel(chapterSlug: unknown): string {
  const raw = String(chapterSlug || "").trim();
  if (!raw) return "";
  return t("chapter.label", { number: raw.replace(/-/g, ".") });
}

// "10-5" is Chapter 10.5; slugs that are not plain numbers sort after every numbered chapter.
function chapterOrder(slug: string): number {
  return /^\d+(-\d+)?$/.test(slug) ? Number(slug.replace("-", ".")) : Infinity;
}

function compareChapterSlugs(a: string, b: string): number {
  const orderA = chapterOrder(a);
  const orderB = chapterOrder(b);
  if (orderA !== orderB) return orderA < orderB ? -1 : 1;
  return a.localeCompare(b);
}

function mergeReadLists(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort(compareChapterSlugs).slice(-MAX_READ_CHAPTERS);
}

// Accepts the export wrapper { version, history } or a bare history object. Entries that fail
// validation are dropped rather than failing the whole import.
export function parseHistoryImport(raw: unknown): ReadingHistory {
  const incoming: ReadingHistory = {};
  if (!isRecord(raw)) return incoming;
  const source = "version" in raw && isRecord(raw["history"]) ? raw["history"] : raw;
  for (const [key, value] of Object.entries(source)) {
    const entry = parseEntry(value);
    // lastHref is a page path from this site. Anything else (absolute or protocol-relative URLs) is
    // rejected so an imported entry cannot link somewhere else.
    if (!key || !entry || !entry.lastChapter) continue;
    if (!entry.lastHref.startsWith("/") || entry.lastHref.startsWith("//")) continue;
    incoming[key] = entry;
  }
  return incoming;
}

// Keys present in both keep the fields of the newer entry (ties keep the current one).
// Read lists are always unioned, sorted by chapter, and capped to the highest chapters.
export function mergeHistory(current: ReadingHistory, incoming: ReadingHistory): ReadingHistory {
  const merged: ReadingHistory = { ...current };
  for (const [key, entry] of Object.entries(incoming)) {
    const existing = current[key];
    if (!existing) {
      merged[key] = { ...entry, read: mergeReadLists([], entry.read) };
    } else {
      const base = entry.lastTs > existing.lastTs ? entry : existing;
      merged[key] = { ...base, read: mergeReadLists(existing.read, entry.read) };
    }
  }
  return merged;
}

export function formatHistoryAge(timestamp: number, now: number): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t("time.ago.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.ago.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("time.ago.days", { count: days });
  // English keeps the browser's own date format, which is what the app showed before translations existed.
  const locale = getLocale();
  return new Date(timestamp).toLocaleDateString(locale === "en" ? undefined : locale);
}

export const HistoryStore = {
  load(): ReadingHistory {
    const raw = GM_getValue<unknown>(STORAGE_KEY, {});
    if (!isRecord(raw)) return {};
    const history: ReadingHistory = {};
    for (const [slug, value] of Object.entries(raw)) {
      const entry = parseEntry(value);
      if (entry) history[slug] = entry;
    }
    return history;
  },

  save(history: ReadingHistory): void {
    GM_setValue(STORAGE_KEY, history);
  },

  getSeries(seriesSlug: string): HistoryEntry | null {
    if (!seriesSlug) return null;
    return this.load()[seriesSlug] ?? null;
  },

  // progress === null means "presence ping" (page load): keeps the stored
  // progress for the same chapter instead of clobbering it with 0.
  recordVisit({ seriesSlug, chapterSlug, href, title, progress = null }: VisitInput): HistoryEntry | null {
    if (!seriesSlug || !chapterSlug) return null;

    const history = this.load();
    const prev = history[seriesSlug];
    const read = prev?.read.slice(-MAX_READ_CHAPTERS) ?? [];
    const sameChapter = prev?.lastChapter === chapterSlug;

    let nextProgress;
    if (progress === null) {
      nextProgress = sameChapter ? Number(prev?.lastProgress) || 0 : 0;
    } else {
      const n = Number(progress);
      nextProgress = Number.isFinite(n)
        ? Math.max(0, Math.min(100, Math.round(n)))
        : 0;
    }

    if (nextProgress >= COMPLETED_THRESHOLD && !read.includes(chapterSlug)) {
      read.push(chapterSlug);
    }

    const entry = {
      title: title || prev?.title || seriesSlug,
      lastChapter: chapterSlug,
      lastHref: href || prev?.lastHref || "",
      lastTs: Date.now(),
      lastProgress: nextProgress,
      read,
    };
    history[seriesSlug] = entry;
    this.prune(history);
    this.save(history);
    return entry;
  },

  prune(history: ReadingHistory): void {
    const keys = Object.keys(history);
    if (keys.length <= MAX_SERIES) return;
    keys
      .sort(
        (a, b) => (Number(history[a]?.lastTs) || 0) - (Number(history[b]?.lastTs) || 0)
      )
      .slice(0, keys.length - MAX_SERIES)
      .forEach((key) => delete history[key]);
  },

  // Replaces the read list (used by "Mark Read Up To"). A missing entry is created as if its
  // chapter had just been finished, so it shows up in the continue pill.
  setReadChapters(
    seriesSlug: string,
    chapterSlugs: string[],
    fallback: Pick<HistoryEntry, "title" | "lastChapter" | "lastHref">
  ): void {
    if (!seriesSlug) return;
    const history = this.load();
    const prev = history[seriesSlug];
    history[seriesSlug] = prev
      ? { ...prev, read: chapterSlugs }
      : { ...fallback, lastTs: Date.now(), lastProgress: 100, read: chapterSlugs };
    this.prune(history);
    this.save(history);
  },

  isRead(entry: HistoryEntry | null, chapterSlug: string): boolean {
    return !!entry && entry.read.includes(chapterSlug);
  },

  remove(seriesSlug: string): void {
    const history = this.load();
    delete history[seriesSlug];
    this.save(history);
  },

  // Returns how many entries were merged in. 0 means no valid entries were found and nothing was saved.
  importEntries(raw: unknown): number {
    const incoming = parseHistoryImport(raw);
    const count = Object.keys(incoming).length;
    if (count === 0) return 0;
    const history = mergeHistory(this.load(), incoming);
    this.prune(history);
    this.save(history);
    return count;
  },

  clear(): void {
    GM_setValue(STORAGE_KEY, {});
  },
};

export { parseReaderPath, parseSeriesPath, chapterSlugToLabel };
