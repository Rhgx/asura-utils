export interface ChapterReaderInfo {
  isLocked: boolean | null;
  isPremium: boolean | null;
  unlockTime: string | null;
  pageCount: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Astro serializes each island prop as [type, value], so the value is the second item.
function unwrapProp(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[1] : undefined;
}

export function parseChapterReaderProps(props: string): ChapterReaderInfo | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(props);
  } catch (_error) {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const isLocked = unwrapProp(parsed["isLocked"]);
  const isPremium = unwrapProp(parsed["isPremium"]);
  const unlockTime = unwrapProp(parsed["unlockTime"]);
  const pages = unwrapProp(parsed["pages"]);
  return {
    isLocked: typeof isLocked === "boolean" ? isLocked : null,
    isPremium: typeof isPremium === "boolean" ? isPremium : null,
    unlockTime: typeof unlockTime === "string" ? unlockTime : null,
    pageCount: Array.isArray(pages) ? pages.length : null,
  };
}

export function findChapterReaderInfo(root: Document): ChapterReaderInfo | null {
  const props = root
    .querySelector('astro-island[component-url*="ChapterReader"]')
    ?.getAttribute("props");
  if (!props) return null;
  return parseChapterReaderProps(props);
}
