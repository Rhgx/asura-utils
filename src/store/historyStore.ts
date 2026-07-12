const STORAGE_KEY = "readingHistory";
const MAX_SERIES = 150;
const MAX_READ_CHAPTERS = 600;
const COMPLETED_THRESHOLD = 90;

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

function parseReaderPath(path: unknown): ReaderPath | null {
  const match = String(path || "").match(
    /^\/(comics|series)\/([^/?#]+)\/chapter\/([^/?#]+)/
  );
  if (!match) return null;
  return { seriesSlug: match[2]!, chapterSlug: match[3]! };
}

function parseSeriesPath(path: unknown): string {
  const match = String(path || "").match(/^\/(comics|series)\/([^/?#]+)\/?$/);
  return match?.[2] ?? "";
}

function chapterSlugToLabel(chapterSlug: unknown): string {
  const raw = String(chapterSlug || "").trim();
  if (!raw) return "";
  return `Chapter ${raw.replace(/-/g, ".")}`;
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

  isRead(entry: HistoryEntry | null, chapterSlug: string): boolean {
    return !!entry && entry.read.includes(chapterSlug);
  },

  clear(): void {
    GM_setValue(STORAGE_KEY, {});
  },
};

export { parseReaderPath, parseSeriesPath, chapterSlugToLabel };
