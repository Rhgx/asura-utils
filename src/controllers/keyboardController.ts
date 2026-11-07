import { CONSTANTS } from "../config/defaults.js";
import {
  KEYBIND_FIELDS,
  matchesBinding,
  matchesReaderAlternate,
} from "../config/keybinds.js";
import type { KeybindKey } from "../config/keybinds.js";
import { t } from "../i18n/index.js";
import { ConfigStore } from "../store/configStore.js";
import type { PageControllerContext } from "./types.js";

interface ReaderKeyAction {
  key: KeybindKey;
  // Only makes sense for comic images, so novel text leaves the key alone.
  comicsOnly?: boolean;
  run(controller: PageControllerContext): void;
}

// Checked in order, and the first match owns the key even when it cannot act on this page.
const READER_KEY_ACTIONS: readonly ReaderKeyAction[] = [
  { key: "keybindToggleScroll", run: (c) => c.reader.toggleScroll() },
  {
    key: "keybindSpeedUp",
    run: (c) => c.showHint(t("hint.speed", { speed: c.reader.stepSpeed(CONSTANTS.SPEED_STEP) })),
  },
  {
    key: "keybindSpeedDown",
    run: (c) => c.showHint(t("hint.speed", { speed: c.reader.stepSpeed(-CONSTANTS.SPEED_STEP) })),
  },
  { key: "keybindNextChapter", run: (c) => c.reader.navigate("next") },
  { key: "keybindPrevChapter", run: (c) => c.reader.navigate("prev") },
  { key: "keybindNextPage", comicsOnly: true, run: (c) => c.reader.jumpPage("next") },
  { key: "keybindPrevPage", comicsOnly: true, run: (c) => c.reader.jumpPage("prev") },
  { key: "keybindGoSeries", run: (c) => c.reader.goSeries() },
  { key: "keybindToggleFitWidth", comicsOnly: true, run: (c) => c.reader.toggleFitWidth() },
  { key: "keybindToggleDock", run: (c) => c.dockView.toggle() },
];

export const keyboardController = {
  handleKeyDown(e: KeyboardEvent): void {
    const targetElement = e.target instanceof Element ? e.target : null;
    const tag = targetElement?.tagName || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // The settings dialog is modal, so no shortcut may act on the page behind it, wherever focus is.
    if (document.getElementById("au-modal-overlay")) return;
    // The focused progress bar uses the arrow keys to seek rather than to change chapter.
    if (targetElement?.closest("#au-progress-bar")) return;
    if (targetElement?.closest("[contenteditable='true'],[contenteditable='']")) return;
    // A focused control needs Enter and Space for itself, whatever those keys are bound to.
    if ((e.key === "Enter" || e.key === " ") && targetElement?.closest("button, a, summary")) return;

    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const isBoundTo = (key: KeybindKey) => matchesBinding(e, ConfigStore.get(key));
    const context = this.getPageContext();

    if (context.isReader) {
      // A key the user assigned always beats a built-in alternate, so what Settings reports is what happens.
      // The series-page shortcut does nothing in the reader, so it does not claim a key here.
      const isAssigned = KEYBIND_FIELDS.some((field) => field.key !== "keybindJumpChapters" && isBoundTo(field.key));
      const action = READER_KEY_ACTIONS.find(
        ({ key }) => isBoundTo(key) || (!isAssigned && matchesReaderAlternate(e, key))
      );
      if (action) {
        if (ConfigStore.get("readerWidget") && !(action.comicsOnly && context.isNovel)) {
          consume();
          action.run(this);
        }
        return;
      }
    }

    if (isBoundTo("keybindFocusSearch")) {
      consume();
      this.focusSearch();
      return;
    }

    if (context.isSeriesPage && isBoundTo("keybindJumpChapters")) {
      consume();
      this.scrollToChapterList();
    }
  },

  handleDblClick(e: MouseEvent): void {
    if (!this.pageContext.isReader) return;
    if (!ConfigStore.get("readerWidget")) return;
    if (!ConfigStore.get("doubleClickScroll")) return;

    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest("#au-reader-dock-shell")) return;
    if (target.closest("#au-modal-overlay")) return;

    this.reader.toggleScroll();
  },

  focusSearch() {
    const searchInput =
      document.querySelector<HTMLInputElement>('input[placeholder*="Search"]') ||
      document.querySelector<HTMLInputElement>('input[type="search"]') ||
      document.querySelector<HTMLInputElement>("#browse-interactive input") ||
      document.querySelector<HTMLInputElement>(".series-search input");

    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Header search may render as a button that opens a dialog.
    const searchTrigger =
      document.querySelector<HTMLButtonElement>('astro-island[component-url*="SearchBar"] button') ||
      document.querySelector<HTMLButtonElement>('header button[aria-label*="search" i]');
    if (searchTrigger) searchTrigger.click();
  },

  scrollToChapterList() {
    const headings = Array.from(document.querySelectorAll("h2, h3, h4"));
    const chapterHeading = headings.find((h) =>
      (h.textContent || "").toLowerCase().includes("chapter")
    );

    const chapterSection =
      chapterHeading ||
      document.querySelector('astro-island[component-url*="ChapterListReact"]') ||
      document.querySelector('[class*="chapter"]') ||
      document.querySelector("div.chapter");

    const firstChapter = document.querySelector('a[href*="/chapter/"]');
    const target = chapterSection || (firstChapter && firstChapter.closest("div"));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  },

} satisfies ThisType<PageControllerContext>;
