// Kept free of ConfigStore and other GM-backed imports so the unit tests can load this module.

export type PageDirection = "prev" | "next";

// The reading line sits a third of the way down the viewport, so the page under it counts as current.
const READING_LINE_RATIO = 0.35;
// Prev only steps back a page once the reader is within this distance of the current page top.
const PAGE_TOP_SLACK_PX = 40;

// tops holds the absolute document offset of each page, in document order.
// Returns a 0-based index, with 0 as the minimum even when the reading line sits above the first page.
export function getCurrentPageIndex(
  tops: readonly number[],
  scrollY: number,
  viewportHeight: number,
): number {
  const readingLine = scrollY + viewportHeight * READING_LINE_RATIO;
  let index = 0;
  for (const [i, top] of tops.entries()) {
    if (top > readingLine) break;
    index = i;
  }
  return index;
}

// Returns the 0-based page to scroll to, or null when there is no page in that direction.
export function getPageJumpIndex(
  tops: readonly number[],
  scrollY: number,
  viewportHeight: number,
  direction: PageDirection,
): number | null {
  const current = getCurrentPageIndex(tops, scrollY, viewportHeight);
  const currentTop = tops[current];
  // No measured pages means there is nothing to jump between.
  if (currentTop === undefined) return null;

  if (direction === "next") {
    return current + 1 < tops.length ? current + 1 : null;
  }
  // Partway down a tall page, prev returns to that page's top before stepping to the one before.
  if (scrollY - currentTop > PAGE_TOP_SLACK_PX) return current;
  return current > 0 ? current - 1 : null;
}
