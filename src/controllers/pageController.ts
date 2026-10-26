import { ThemeController } from "../theme/themeController.js";
import { ProgressBarView } from "../views/progressBarView.js";
import { ReaderDockView } from "../views/readerDockView.js";
import { SettingsModalView } from "../views/settingsModalView.js";
import { ReaderController } from "./readerController.js";
import { chapterEndController } from "./chapterEndController.js";
import { pageCleanupController } from "./pageCleanupController.js";
import { pageTargetController } from "./pageTargetController.js";
import { readingHistoryController } from "./readingHistoryController.js";
import { newChapterBadgeController } from "./newChapterBadgeController.js";
import { seriesFilterController } from "./seriesFilterController.js";
import { chapterToolsController } from "./chapterToolsController.js";
import { ConfigStore } from "../store/configStore.js";
import { CONSTANTS } from "../config/defaults.js";
import type { ConfigKey } from "../config/defaults.js";
import { matchesBinding } from "../config/keybinds.js";
import { resolveLocale, setLocale } from "../i18n/index.js";
import type { PageContext, PageControllerContext, QueryRoot } from "./types.js";
import type { ReaderStateSnapshot } from "./readerController.js";

const SERIES_LINK_SELECTOR = 'a[href*="/comics/"],a[href*="/series/"]';
const CHAPTER_LINK_SELECTOR = 'a[href*="/chapter/"]';
export const PageController = {
  ...readingHistoryController,
  ...newChapterBadgeController,
  ...seriesFilterController,
  ...chapterToolsController,
  ...pageTargetController,
  ...chapterEndController,
  ...pageCleanupController,
  settingsView: new SettingsModalView((key) => PageController.handleConfigChanged(key)),
  progressBarView: new ProgressBarView(),
  dockView: new ReaderDockView((collapsed) => {
    ConfigStore.set("readerDockCollapsed", collapsed);
  }),
  reader: new ReaderController(
    (state) => PageController.syncReaderState(state),
    (message) => PageController.showHint(message),
  ),
  observer: null as MutationObserver | null,
  debounceTimer: undefined as number | undefined,
  viewportFrameId: 0,
  resizePending: false,
  hintTimer: undefined as number | undefined,
  globalListenersBound: false,
  readerMounted: false,
  endActionChapterKey: "",
  endActionCompleted: false,
  endActionInFlight: false,
  endActionHintTs: 0,
  prefetchedChapterKey: "",
  historyWriteTs: 0,
  historyWrittenChapterKey: "",
  historyWrittenProgress: null as number | null,
  resumeAttemptedKey: "",
  chapterPickMode: false,
  chapterAccessCache: new Map<string, { allowed: boolean; reason: string }>(),
  pageContext: {
    isReader: false,
    isSeriesPage: false,
    isSeriesListing: false,
    isAuthPage: false,
    isNovel: false,
  },

  init() {
    this.chapterAccessCache = new Map();
    this.endActionChapterKey = "";
    this.endActionCompleted = false;
    this.endActionInFlight = false;
    this.endActionHintTs = 0;
    this.prefetchedChapterKey = "";

    ThemeController.apply(ConfigStore.get("themePreset"));
    this.bindGlobalListeners();
    this.observeMutations();
    this.run();
  },

  observeMutations() {
    if (this.observer || !document.body) return;
    this.observer = new MutationObserver((mutations) => {
      // Ignore our own UI updates so a controller run cannot recursively schedule itself.
      const siteChanged = mutations.some((mutation) => {
        const target = mutation.target;
        if (
          target instanceof Element &&
          (target.id.startsWith("au-") || target.closest("[id^='au-']"))
        ) {
          return false;
        }
        const changedNodes = [
          ...Array.from(mutation.addedNodes),
          ...Array.from(mutation.removedNodes),
        ];
        return changedNodes.some((node) => {
          if (!(node instanceof Element)) return node.nodeType === Node.TEXT_NODE;
          if (node.id.startsWith("au-") || node.closest("[id^='au-']")) return false;
          return true;
        });
      });
      if (!siteChanged) return;
      if (this.pageContext.isReader) {
        // Chapter images are hydrated lazily, so any site mutation can stale the cached bounds.
        this.reader.invalidateDocumentCache();
      }
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => this.run(), 250);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  },

  bindGlobalListeners() {
    if (this.globalListenersBound) return;
    this.globalListenersBound = true;

    // Capture on window so this runs before the site's document-level key handlers; stopPropagation keeps them from also acting on the same key.
    window.addEventListener("keydown", (e) => this.handleKeyDown(e), true);
    // Chapter pick mode needs its own capture listeners: the click must be stopped before the site's chapter links act on it.
    document.addEventListener("click", (e) => this.handleChapterPickClick(e), true);
    document.addEventListener("click", (e) => this.handleSeriesHideClick(e), true);
    window.addEventListener("keydown", (e) => this.handleChapterPickKeyDown(e), true);
    document.addEventListener("dblclick", (e) => this.handleDblClick(e));
    window.addEventListener("scroll", () => this.handleScroll(), {
      passive: true,
    });
    window.addEventListener("resize", () => this.handleResize(), {
      passive: true,
    });
  },

  getPageContext(): PageContext {
    const path = window.location.pathname || "/";
    const isReader = /\/chapter\/[^/?#]+/.test(path);
    const isSeriesListing = /^\/(browse|series)(\/|$)/.test(path);
    const isNovel = /^\/novels\/[^/?#]+/.test(path);
    const isSeriesPage =
      (/^\/(comics|series)\/[^/?#]+/.test(path) || isNovel) && !isReader;
    const isAuthPage = /^\/(login|signup|forgot-password|reset-password)(\/|$)/.test(
      path
    );
    return { isReader, isSeriesPage, isSeriesListing, isAuthPage, isNovel };
  },

  run() {
    if (!document.body) return;

    this.pageContext = this.getPageContext();
    this.refreshEndActionChapterState();
    ThemeController.apply(ConfigStore.get("themePreset"));
    this.applyBodyClasses();
    this.settingsView.createHeaderButton();
    this.applyOverhaulTargets();

    if (this.pageContext.isReader && ConfigStore.get("readerWidget")) {
      this.mountReaderUI();
    } else {
      this.unmountReaderUI();
    }

    this.cleanupBackToTopControl();
    this.cleanupBetaBanner();
    this.cleanupCompactSidebar();
    this.cleanupHomeSections();
    this.cleanupExtraSections();
    this.applySeriesFilters();
    this.applyReaderBrightness();
    this.recordReaderVisit();
    this.applyHistoryUI();
    this.applyChapterTools();
    this.applyNewChapterBadges();
    this.maybeResumeChapterPosition();
    this.syncReaderState();
    this.maybeRunChapterEndAction();
  },

  mountReaderUI() {
    if (this.readerMounted && this.dockView.isMounted()) {
      if (ConfigStore.get("showProgressBar")) this.progressBarView.mount();
      else this.progressBarView.unmount();
      return;
    }

    this.readerMounted = false;
    this.reader.start();

    this.dockView.mount({
      toggleScroll: () => this.reader.toggleScroll(),
      setSpeed: (value) => this.reader.setSpeed(value),
      stepSpeed: (delta) => this.reader.stepSpeed(delta),
      setWidth: (value) => this.reader.setWidth(value),
      stepWidth: (delta) => this.reader.stepWidth(delta),
      toggleFitWidth: () => this.reader.toggleFitWidth(),
      setBrightness: (value) => {
        ConfigStore.set("readerBrightness", value);
        this.applyReaderBrightness();
        this.syncReaderState();
      },
      navigate: (direction) => this.reader.navigate(direction),
      jumpPage: (direction) => this.reader.jumpPage(direction),
      goSeries: () => this.reader.goSeries(),
      goTop: () => this.reader.goTop(),
      openSettings: () => {
        // The modal has no explicit open method, so only toggle when it is not already showing.
        if (!document.getElementById("au-modal-overlay")) this.settingsView.toggleModal();
      },
    });

    this.dockView.setCollapsed(ConfigStore.get("readerDockCollapsed"), false);

    if (ConfigStore.get("showProgressBar")) {
      this.progressBarView.mount();
    } else {
      this.progressBarView.unmount();
    }

    this.readerMounted = true;
  },

  unmountReaderUI() {
    if (this.readerMounted) this.reader.stop();
    this.dockView.unmount();
    this.progressBarView.unmount();
    this.readerMounted = false;
  },

  syncReaderState(state?: ReaderStateSnapshot): void {
    if (!this.pageContext.isReader || !this.readerMounted) return;
    const snapshot = state || this.reader.getStateSnapshot();

    this.dockView.sync(snapshot);

    if (ConfigStore.get("showProgressBar")) {
      this.progressBarView.mount();
      this.progressBarView.update(snapshot.progress, snapshot.page, snapshot.pageCount);
    } else {
      this.progressBarView.unmount();
    }
  },

  applyBodyClasses() {
    const body = document.body;
    if (!body) return;

    body.classList.add("au-theme-enabled");
    body.classList.toggle("au-hide-slider", !!ConfigStore.get("hideSlider"));
    body.classList.toggle(
      "au-color-timestamps",
      !!ConfigStore.get("colorTimestamps")
    );
    body.classList.toggle("au-adblock", !!ConfigStore.get("adBlock"));
    body.classList.toggle("au-hide-toraka", !!ConfigStore.get("hideToraka"));
    body.classList.toggle(
      "au-hide-comments",
      !!ConfigStore.get("hideComments")
    );
    body.classList.toggle("au-fit-width", !!ConfigStore.get("fitWidthMode"));
    body.classList.toggle(
      "au-hide-btt",
      !!ConfigStore.get("hideDefaultBackToTop")
    );
    body.classList.toggle(
      "au-compact-sidebar",
      !!ConfigStore.get("compactSidebar")
    );
    body.classList.toggle(
      "au-hide-popular",
      !!ConfigStore.get("hidePopularSection")
    );
    body.classList.toggle("au-hide-announcements", !!ConfigStore.get("hideAnnouncements"));
    body.classList.toggle("au-hide-novel-promos", !!ConfigStore.get("hideNovelPromos"));
    body.classList.toggle("au-hide-reactions", !!ConfigStore.get("hideReactions"));
    body.classList.toggle(
      "au-menu-series-overhaul",
      !!ConfigStore.get("menuSeriesOverhaul")
    );
    // Comic series layout (au-page-series) does not apply to novel series pages.
    body.classList.toggle(
      "au-page-series",
      this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing && !this.pageContext.isNovel
    );
    body.classList.toggle("au-page-novel", this.pageContext.isNovel);
    body.classList.toggle(
      "au-page-novel-reader",
      this.pageContext.isNovel && this.pageContext.isReader
    );
    body.classList.toggle("au-page-listing", this.pageContext.isSeriesListing);
    body.classList.toggle("au-page-reader", this.pageContext.isReader);
    body.classList.toggle(
      "au-hide-native-reader",
      this.pageContext.isReader && !!ConfigStore.get("hideNativeReaderControls")
    );
    body.classList.toggle("au-page-auth", this.pageContext.isAuthPage);
    body.classList.toggle("au-page-ebooks", window.location.pathname.startsWith("/ebooks"));
    body.classList.toggle(
      "au-page-series-ranking",
      window.location.pathname.startsWith("/series-ranking")
    );
    body.classList.toggle(
      "au-page-leaderboard",
      window.location.pathname.startsWith("/leaderboard")
    );
  },

  handleConfigChanged(key: ConfigKey): void {
    if (key === "themePreset") {
      ThemeController.apply(ConfigStore.get("themePreset"));
    }

    if (key === "language") {
      setLocale(resolveLocale(ConfigStore.get("language"), navigator.languages));
      // These nodes are built once with their text, so remove them and let run() build them again.
      document.getElementById("au-continue-reading")?.remove();
      document.getElementById("au-chapter-tools")?.remove();
      document.querySelectorAll(".au-hide-series-btn").forEach((button) => button.remove());
      const headerButton = document.getElementById("au-settings-btn-main");
      if (headerButton && (headerButton.textContent || headerButton.title)) headerButton.remove();
      this.unmountReaderUI();
    }

    if (key === "readerWidget") {
      this.run();
      return;
    }

    if (key === "showProgressBar") {
      if (
        ConfigStore.get("showProgressBar") &&
        this.pageContext.isReader &&
        this.readerMounted
      ) {
        this.progressBarView.mount();
      } else {
        this.progressBarView.unmount();
      }
    }

    if (key === "fitWidthMode") {
      document.body.classList.toggle(
        "au-fit-width",
        !!ConfigStore.get("fitWidthMode")
      );
    }

    if (key === "imageWidth") {
      this.reader.state.width = ConfigStore.get("imageWidth");
      this.reader.applyWidth();
    }

    if (key === "autoScrollSpeed") {
      this.reader.state.speed = ConfigStore.get("autoScrollSpeed");
    }

    if (key === "readerBrightness") {
      this.applyReaderBrightness();
    }

    if (key === "hasPremiumAccess") {
      this.chapterAccessCache = new Map();
    }

    this.applyBodyClasses();
    this.run();
  },

  handleScroll() {
    if (!this.pageContext.isReader) return;
    this.scheduleViewportUpdate();
  },

  handleResize() {
    this.scheduleViewportUpdate(true);
  },

  scheduleViewportUpdate(resize = false) {
    this.resizePending ||= resize;
    if (this.viewportFrameId) return;
    // Group rapid scroll and resize events into one update per animation frame.
    this.viewportFrameId = window.requestAnimationFrame(() => {
      this.viewportFrameId = 0;
      if (this.resizePending) {
        this.resizePending = false;
        this.cleanupCompactSidebar();
        this.reader.invalidateGeometry();
      }
      if (!this.pageContext.isReader) return;
      this.maybeRunChapterEndAction();
      this.maybePrefetchNextChapter();
      const progress = this.reader.getProgress();
      this.recordReaderVisit(progress);
      if (!this.readerMounted) return;
      this.syncReaderState(this.reader.getStateSnapshot(progress));
    });
  },

  handleKeyDown(e: KeyboardEvent): void {
    const targetElement = e.target instanceof Element ? e.target : null;
    const tag = targetElement?.tagName || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (targetElement?.closest("#au-modal-overlay")) {
      return;
    }
    if (targetElement?.closest("[contenteditable='true'],[contenteditable='']")) {
      return;
    }

    const context = this.getPageContext();
    const key = typeof e.key === "string" ? e.key : "";
    const code = e.code || "";
    const matchesConfig = (configKey: ConfigKey, legacy = false) =>
      matchesBinding(e, ConfigStore.get(configKey)) || !!legacy;

    if (context.isReader) {
      const readerEnabled = ConfigStore.get("readerWidget");
      const speedUpLegacy = key === "=" || key === "+" || code === "NumpadAdd";
      const speedDownLegacy =
        key === "-" || key === "_" || code === "NumpadSubtract";
      const nextLegacy = key === "ArrowRight" || key === "PageDown" || key === "]";
      const prevLegacy = key === "ArrowLeft" || key === "PageUp" || key === "[";

      if (matchesConfig("keybindToggleScroll")) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.toggleScroll();
        }
        return;
      }

      if (matchesConfig("keybindSpeedUp", speedUpLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.stepSpeed(CONSTANTS.SPEED_STEP);
        }
        return;
      }

      if (matchesConfig("keybindSpeedDown", speedDownLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.stepSpeed(-CONSTANTS.SPEED_STEP);
        }
        return;
      }

      if (matchesConfig("keybindNextChapter", nextLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.navigate("next");
        }
        return;
      }

      if (matchesConfig("keybindPrevChapter", prevLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.navigate("prev");
        }
        return;
      }

      if (matchesConfig("keybindNextPage")) {
        // Page jumps only make sense for comic images, so novel text leaves the key alone.
        if (readerEnabled && !context.isNovel) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.jumpPage("next");
        }
        return;
      }

      if (matchesConfig("keybindPrevPage")) {
        if (readerEnabled && !context.isNovel) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.jumpPage("prev");
        }
        return;
      }

      if (matchesConfig("keybindGoSeries")) {
        if (readerEnabled) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.goSeries();
        }
        return;
      }

      if (matchesConfig("keybindToggleFitWidth")) {
        // Fit width only affects chapter images, so novel text leaves the key alone.
        if (readerEnabled && !context.isNovel) {
          e.preventDefault();
          e.stopPropagation();
          this.reader.toggleFitWidth();
        }
        return;
      }
    }

    if (matchesConfig("keybindFocusSearch")) {
      e.preventDefault();
      e.stopPropagation();
      this.focusSearch();
      return;
    }

    if (context.isSeriesPage) {
      if (matchesConfig("keybindJumpChapters")) {
        e.preventDefault();
        e.stopPropagation();
        this.scrollToChapterList();
        return;
      }
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

  showHint(message: string): void {
    let hint = document.getElementById("au-shortcut-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "au-shortcut-hint";
      hint.className = "au-shortcut-hint";
      document.body.appendChild(hint);
    }

    hint.textContent = message;
    hint.classList.add("visible");
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => hint.classList.remove("visible"), 1000);
  },

  hasClasses(el: Element | null | undefined, classes: readonly string[]): boolean {
    return !!el && !!el.classList && classes.every((c) => el.classList.contains(c));
  },

  hasClassSnippets(el: Element | null | undefined, snippets: readonly string[]): boolean {
    if (!el || typeof el.className !== "string") return false;
    return snippets.every((snippet) => el.className.includes(snippet));
  },

  findAncestor(el: Element, predicate: (element: Element) => boolean): Element | null {
    let cur: Element | null = el;
    while (cur && cur !== document.body) {
      if (predicate(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  },

  getSeriesAnchors(root: QueryRoot = document, options: { includeChapters?: boolean } = {}): HTMLAnchorElement[] {
    const { includeChapters = false } = options;
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll<HTMLAnchorElement>(SERIES_LINK_SELECTOR)).filter((anchor) => {
      const href = anchor.getAttribute("href") || anchor.href || "";
      if (!href) return false;
      return includeChapters || !href.includes("/chapter/");
    });
  },

  getChapterAnchors(root: QueryRoot = document): HTMLAnchorElement[] {
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll<HTMLAnchorElement>(CHAPTER_LINK_SELECTOR)).filter((anchor) => {
      const href = anchor.getAttribute("href") || anchor.href || "";
      return /\/chapter\//.test(href);
    });
  },

} satisfies ThisType<PageControllerContext>;
