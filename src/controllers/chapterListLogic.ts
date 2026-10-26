import { MAX_READ_CHAPTERS } from "../store/historyStore.js";
import { chapterSlugToNumber } from "./newChapterBadgeLogic.js";
import { parseIslandProps, unwrapProp } from "./chapterProps.js";

// Kept free of ConfigStore and other GM-backed imports so the unit tests can load this module.

export interface KnownChapter {
  number: number;
  slug: string;
  href: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Chapter list props carry every chapter, while the DOM only holds the rendered rows.
function extractChapterNumbers(props: string): number[] {
  const parsed = parseIslandProps(props);
  const chapters = unwrapProp(parsed?.["chapters"]);
  if (!Array.isArray(chapters)) return [];
  const numbers: number[] = [];
  for (const item of chapters) {
    const record = unwrapProp(item);
    if (!isRecord(record)) continue;
    const number = unwrapProp(record["number"]);
    if (typeof number === "number") numbers.push(number);
  }
  return numbers;
}

// Chapter list props can be megabytes and run() fires after every DOM change, so parsed numbers are
// kept per island and only reparsed when its props string changes.
const islandNumberCache = new WeakMap<Element, { props: string; numbers: number[] }>();

export function chapterNumbersForIsland(island: Element): number[] {
  const props = island.getAttribute("props") || "";
  const cached = islandNumberCache.get(island);
  if (cached && cached.props === props) return cached.numbers;

  // Cheap substring check first: most islands carry no chapter list.
  const numbers = props.includes('"chapters"') ? extractChapterNumbers(props) : [];
  islandNumberCache.set(island, { props, numbers });
  return numbers;
}

function chapterSlugFromHref(href: string): string {
  return href.match(/\/chapter\/([^/?#]+)/)?.[1] ?? "";
}

// Chapter slugs use "-" for the decimal point, so "10-5" is chapter 10.5.
export function chapterNumberFromHref(href: string): number {
  return chapterSlugToNumber(chapterSlugFromHref(href));
}

// DOM links win over props for the same number so the stored href is the one the page actually uses.
// Props-only chapters get the slug and href the site would use. Result is sorted ascending.
export function buildKnownChapters(
  numbers: readonly number[],
  hrefs: readonly string[],
  seriesPath: string
): KnownChapter[] {
  const byNumber = new Map<number, KnownChapter>();
  for (const href of hrefs) {
    const slug = chapterSlugFromHref(href);
    const number = chapterSlugToNumber(slug);
    if (!Number.isFinite(number) || byNumber.has(number)) continue;
    byNumber.set(number, { number, slug, href });
  }
  for (const number of numbers) {
    if (!Number.isFinite(number) || byNumber.has(number)) continue;
    const slug = String(number).replace(".", "-");
    byNumber.set(number, { number, slug, href: `${seriesPath}/chapter/${slug}` });
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

// Next unread is the smallest known chapter above the highest read chapter. With nothing read it is
// the first chapter. Returns null when there is nothing left above the highest read chapter.
export function findNextUnread(
  chapters: readonly KnownChapter[],
  read: readonly string[]
): KnownChapter | null {
  let highestRead: number | null = null;
  for (const slug of read) {
    const number = chapterSlugToNumber(slug);
    if (Number.isFinite(number) && (highestRead === null || number > highestRead)) {
      highestRead = number;
    }
  }
  const threshold = highestRead ?? -Infinity;

  let next: KnownChapter | null = null;
  for (const chapter of chapters) {
    if (chapter.number > threshold && (next === null || chapter.number < next.number)) {
      next = chapter;
    }
  }
  return next;
}

// Slugs of every known chapter up to and including the target, ascending. Keeps only the highest
// MAX_READ_CHAPTERS, matching the cap that recordVisit applies to the read list.
export function readSlugsUpTo(chapters: readonly KnownChapter[], target: number): string[] {
  return chapters
    .filter((chapter) => chapter.number <= target)
    .sort((a, b) => a.number - b.number)
    .map((chapter) => chapter.slug)
    .slice(-MAX_READ_CHAPTERS);
}
