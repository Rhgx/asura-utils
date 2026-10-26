import { parseSeriesPath } from "../store/historyStore.js";
import type { HistoryEntry, ReadingHistory } from "../store/historyStore.js";
import { parseIslandProps, unwrapProp } from "./chapterProps.js";
import { t, tPlural } from "../i18n/index.js";

// Kept free of ConfigStore and other GM-backed imports so the unit tests can load this module.

const CHAPTER_PATH_PATTERN = /^\/(comics|novels)\/([^/?#]+)\/chapter\/([^/?#]+)/;

interface LatestChapterRef {
  path: string;
  number: number;
}

interface IslandRefs {
  props: string;
  refs: LatestChapterRef[];
}

// Novel pages carry multi-megabyte props and run() fires after every DOM change,
// so parsed refs are kept per island and only reparsed when its props string changes.
const islandRefCache = new WeakMap<Element, IslandRefs>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Chapter slugs use "-" for the decimal point, so "10-5" is chapter 10.5.
export function chapterSlugToNumber(slug: string): number {
  return parseFloat(slug.replace(/-/g, "."));
}

// Comic cards use public_url and latest_chapter_number; chapter lists and home rows use comic_public_url and number.
function refFromRecord(record: Record<string, unknown>): LatestChapterRef | null {
  const publicUrl = unwrapProp(record["public_url"]);
  const latest = unwrapProp(record["latest_chapter_number"]);
  if (typeof publicUrl === "string" && typeof latest === "number") {
    return { path: publicUrl, number: latest };
  }

  const comicUrl = unwrapProp(record["comic_public_url"]);
  const number = unwrapProp(record["number"]);
  if (typeof comicUrl === "string" && typeof number === "number") {
    return { path: comicUrl, number };
  }
  return null;
}

function collectRefs(node: unknown, refs: LatestChapterRef[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return;
  }
  if (!isRecord(node)) return;

  const ref = refFromRecord(node);
  if (ref) refs.push(ref);
  // Items can nest other records (e.g. a chapter list inside a series), so keep walking.
  for (const value of Object.values(node)) collectRefs(value, refs);
}

function extractLatestChapterRefs(props: string): LatestChapterRef[] {
  const refs: LatestChapterRef[] = [];
  const parsed = parseIslandProps(props);
  if (parsed) collectRefs(parsed, refs);
  return refs;
}

function refsForIsland(island: Element, props: string): LatestChapterRef[] {
  const cached = islandRefCache.get(island);
  if (cached && cached.props === props) return cached.refs;

  // Cheap substring check first: most islands carry no series or chapter data.
  const refs = props.includes("public_url") ? extractLatestChapterRefs(props) : [];
  islandRefCache.set(island, { props, refs });
  return refs;
}

// Highest chapter number seen per series path, from island props and chapter links on the page.
export function collectLatestChapters(root: Document): Map<string, number> {
  const latest = new Map<string, number>();
  const record = (path: string, number: number): void => {
    if (Number.isFinite(number) && number > (latest.get(path) ?? -Infinity)) {
      latest.set(path, number);
    }
  };

  root.querySelectorAll("astro-island[props]").forEach((island) => {
    const props = island.getAttribute("props") || "";
    for (const ref of refsForIsland(island, props)) record(ref.path, ref.number);
  });

  root.querySelectorAll<HTMLAnchorElement>('a[href*="/chapter/"]').forEach((anchor) => {
    if (anchor.closest("[id^='au-']")) return;
    const match = anchor.pathname.match(CHAPTER_PATH_PATTERN);
    if (!match) return;
    record(`/${match[1]!}/${match[2]!}`, chapterSlugToNumber(match[3]!));
  });
  return latest;
}

// The highest chapter the user has reached, so "new" means newer than anything they have read.
function getLastReadNumber(entry: HistoryEntry): number | null {
  let lastRead: number | null = null;
  for (const slug of [entry.lastChapter, ...entry.read]) {
    const number = chapterSlugToNumber(slug);
    if (!Number.isFinite(number)) continue;
    if (lastRead === null || number > lastRead) lastRead = number;
  }
  return lastRead;
}

// Counts whole chapters so a fractional chapter such as 10.5 does not inflate the count.
function getNewChapterLabel(latest: number, lastRead: number): string | null {
  if (latest <= lastRead) return null;
  const count = Math.floor(latest) - Math.floor(lastRead);
  return count >= 1 ? tPlural("badge.newCount", count) : t("badge.new");
}

// Maps series paths (e.g. "/comics/x-3ebcc5a9") to badge text for series with unread chapters.
export function buildBadgeLabels(
  latest: Map<string, number>,
  history: ReadingHistory
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const [path, latestNumber] of latest) {
    const entry = history[parseSeriesPath(path)];
    if (!entry) continue;
    const lastRead = getLastReadNumber(entry);
    if (lastRead === null) continue;
    const label = getNewChapterLabel(latestNumber, lastRead);
    if (label) labels.set(path, label);
  }
  return labels;
}
