const STORAGE_KEY = "readingHistory";
const MAX_SERIES = 150;
const MAX_READ_CHAPTERS = 600;
const COMPLETED_THRESHOLD = 90;

function parseReaderPath(path) {
  const match = String(path || "").match(
    /^\/(comics|series)\/([^/?#]+)\/chapter\/([^/?#]+)/
  );
  if (!match) return null;
  return { seriesSlug: match[2], chapterSlug: match[3] };
}

function parseSeriesPath(path) {
  const match = String(path || "").match(/^\/(comics|series)\/([^/?#]+)\/?$/);
  return match ? match[2] : "";
}

function chapterSlugToLabel(chapterSlug) {
  const raw = String(chapterSlug || "").trim();
  if (!raw) return "";
  return `Chapter ${raw.replace(/-/g, ".")}`;
}

export const HistoryStore = {
  load() {
    const raw = GM_getValue(STORAGE_KEY, {});
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  },

  save(history) {
    GM_setValue(STORAGE_KEY, history);
  },

  getSeries(seriesSlug) {
    if (!seriesSlug) return null;
    const entry = this.load()[seriesSlug];
    return entry && typeof entry === "object" ? entry : null;
  },

  // progress === null means "presence ping" (page load): keeps the stored
  // progress for the same chapter instead of clobbering it with 0.
  recordVisit({ seriesSlug, chapterSlug, href, title, progress = null }) {
    if (!seriesSlug || !chapterSlug) return null;

    const history = this.load();
    const prev =
      history[seriesSlug] && typeof history[seriesSlug] === "object"
        ? history[seriesSlug]
        : {};
    const read = Array.isArray(prev.read)
      ? prev.read.slice(-MAX_READ_CHAPTERS)
      : [];
    const sameChapter = prev.lastChapter === chapterSlug;

    let nextProgress;
    if (progress === null) {
      nextProgress = sameChapter ? Number(prev.lastProgress) || 0 : 0;
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
      title: title || prev.title || seriesSlug,
      lastChapter: chapterSlug,
      lastHref: href || prev.lastHref || "",
      lastTs: Date.now(),
      lastProgress: nextProgress,
      read,
    };
    history[seriesSlug] = entry;
    this.prune(history);
    this.save(history);
    return entry;
  },

  prune(history) {
    const keys = Object.keys(history);
    if (keys.length <= MAX_SERIES) return;
    keys
      .sort(
        (a, b) => (Number(history[a]?.lastTs) || 0) - (Number(history[b]?.lastTs) || 0)
      )
      .slice(0, keys.length - MAX_SERIES)
      .forEach((key) => delete history[key]);
  },

  isRead(entry, chapterSlug) {
    return (
      !!entry && Array.isArray(entry.read) && entry.read.includes(chapterSlug)
    );
  },

  clear() {
    GM_setValue(STORAGE_KEY, {});
  },
};

export { parseReaderPath, parseSeriesPath, chapterSlugToLabel };
