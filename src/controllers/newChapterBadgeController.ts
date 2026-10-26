import { ConfigStore } from "../store/configStore.js";
import { HistoryStore } from "../store/historyStore.js";
import type { PageControllerContext } from "./types.js";
import { buildBadgeLabels, collectLatestChapters } from "./newChapterBadgeLogic.js";

const BADGE_CLASS = "au-new-badge";
const HOST_CLASS = "au-new-badge-host";

function badgeChildren(anchor: HTMLAnchorElement): Element[] {
  return Array.from(anchor.children).filter((child) => child.classList.contains(BADGE_CLASS));
}

// Only touches the DOM when something differs, because run() is triggered by DOM mutations.
function showBadge(anchor: HTMLAnchorElement, label: string): void {
  const [badge, ...duplicates] = badgeChildren(anchor);
  duplicates.forEach((duplicate) => duplicate.remove());

  if (badge) {
    if (badge.textContent !== label) badge.textContent = label;
  } else {
    const span = document.createElement("span");
    span.className = BADGE_CLASS;
    span.textContent = label;
    anchor.appendChild(span);
  }

  if (!anchor.classList.contains(HOST_CLASS)) anchor.classList.add(HOST_CLASS);
}

function hideBadge(anchor: HTMLAnchorElement): void {
  badgeChildren(anchor).forEach((badge) => badge.remove());
  anchor.classList.remove(HOST_CLASS);
}

export const newChapterBadgeController = {
  applyNewChapterBadges() {
    const enabled =
      ConfigStore.get("showNewChapterBadges") &&
      ConfigStore.get("trackReadingHistory") &&
      !this.pageContext.isReader;
    const labels = enabled
      ? buildBadgeLabels(collectLatestChapters(document), HistoryStore.load())
      : new Map<string, string>();

    const shown = new Set<HTMLAnchorElement>();
    if (labels.size > 0) {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
        const label = labels.get(anchor.pathname);
        if (!label || !anchor.querySelector("img")) return;
        if (anchor.closest("header, [id^='au-']")) return;
        showBadge(anchor, label);
        shown.add(anchor);
      });
    }

    document.querySelectorAll<HTMLAnchorElement>(`a.${HOST_CLASS}`).forEach((anchor) => {
      if (!shown.has(anchor)) hideBadge(anchor);
    });
  },
} satisfies ThisType<PageControllerContext>;
