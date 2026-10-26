import { t } from "../i18n/index.js";

export interface ChapterReaderInfo {
  isLocked: boolean | null;
  isPremium: boolean | null;
  unlockTime: string | null;
  pageCount: number | null;
  pageUrls: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Astro serializes each island prop as [type, value], so the value is the second item.
export function unwrapProp(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[1] : undefined;
}

export function parseIslandProps(props: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(props);
  } catch (_error) {
    return null;
  }
  return isRecord(parsed) ? parsed : null;
}

export function parseChapterReaderProps(props: string): ChapterReaderInfo | null {
  const parsed = parseIslandProps(props);
  if (!parsed) return null;

  const isLocked = unwrapProp(parsed["isLocked"]);
  const isPremium = unwrapProp(parsed["isPremium"]);
  const unlockTime = unwrapProp(parsed["unlockTime"]);
  const pages = unwrapProp(parsed["pages"]);
  return {
    isLocked: typeof isLocked === "boolean" ? isLocked : null,
    isPremium: typeof isPremium === "boolean" ? isPremium : null,
    unlockTime: typeof unlockTime === "string" ? unlockTime : null,
    pageCount: Array.isArray(pages) ? pages.length : null,
    pageUrls: parsePageUrls(pages),
  };
}

// Each page is a wrapped record like [0, { url: [0, "https://..."], width: [0, 900], ... }].
function parsePageUrls(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [];
  const urls: string[] = [];
  for (const page of pages) {
    const record = unwrapProp(page);
    if (!isRecord(record)) continue;
    const url = unwrapProp(record["url"]);
    if (typeof url === "string") urls.push(url);
  }
  return urls;
}

// Novel chapters use NovelReader, which only carries a meaningful isLocked here (no pages or unlock time).
export function findChapterReaderInfo(root: Document): ChapterReaderInfo | null {
  const props = root
    .querySelector(
      'astro-island[component-url*="ChapterReader"], astro-island[component-url*="NovelReader"]'
    )
    ?.getAttribute("props");
  if (!props) return null;
  return parseChapterReaderProps(props);
}

export function findNovelReaderTitle(root: Document): string | null {
  const props = root
    .querySelector('astro-island[component-url*="NovelReader"]')
    ?.getAttribute("props");
  if (!props) return null;
  const parsed = parseIslandProps(props);
  const title = unwrapProp(parsed?.["novelTitle"]);
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

// Shows at most two units, largest first, e.g. "in 3d 4h", "in 2h 17m", "in 12m".
export function formatUnlockCountdown(unlockTime: string | null, now: number): string | null {
  if (!unlockTime) return null;
  const unlockMs = Date.parse(unlockTime);
  if (Number.isNaN(unlockMs)) return null;
  const remainingMs = unlockMs - now;
  if (remainingMs <= 0) return null;
  if (remainingMs < 60_000) return t("time.in", { duration: t("time.underMinute") });

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return t("time.in", { duration: countdownDuration(days, hours, minutes) });
}

function countdownDuration(days: number, hours: number, minutes: number): string {
  if (days > 0) {
    const dayText = t("time.unit.day", { count: days });
    if (hours === 0) return dayText;
    return t("time.pair", { first: dayText, second: t("time.unit.hour", { count: hours }) });
  }
  if (hours > 0) {
    const hourText = t("time.unit.hour", { count: hours });
    if (minutes === 0) return hourText;
    return t("time.pair", { first: hourText, second: t("time.unit.minute", { count: minutes }) });
  }
  return t("time.unit.minute", { count: minutes });
}
