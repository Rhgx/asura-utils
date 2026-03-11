import { CONSTANTS } from "../config/defaults.js";
import { matchesBinding } from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { ThemeController } from "../theme/themeController.js";
import { ProgressBarView } from "../views/progressBarView.js";
import { ReaderDockView } from "../views/readerDockView.js";
import { SettingsModalView } from "../views/settingsModalView.js";
import { ReaderController } from "./readerController.js";

export const PageController = {
  settingsView: null,
  progressBarView: null,
  dockView: null,
  reader: null,
  observer: null,
  debounceTimer: null,
  hintTimer: null,
  globalListenersBound: false,
  readerMounted: false,
  endActionChapterKey: "",
  endActionCompleted: false,
  endActionInFlight: false,
  endActionHintTs: 0,
  chapterAccessCache: new Map(),
  pageContext: {
    isReader: false,
    isSeriesPage: false,
    isSeriesListing: false,
    isAuthPage: false,
  },

  init() {
    this.settingsView = new SettingsModalView((key) =>
      this.handleConfigChanged(key)
    );
    this.progressBarView = new ProgressBarView();
    this.dockView = new ReaderDockView((collapsed) => {
      ConfigStore.set("readerDockCollapsed", collapsed);
    });
    this.reader = new ReaderController(
      (state) => this.syncReaderState(state),
      (message) => this.showHint(message)
    );
    this.chapterAccessCache = new Map();
    this.endActionChapterKey = "";
    this.endActionCompleted = false;
    this.endActionInFlight = false;
    this.endActionHintTs = 0;

    ThemeController.apply(ConfigStore.get("themePreset"));
    this.bindGlobalListeners();
    this.observeMutations();
    this.run();
  },

  observeMutations() {
    if (this.observer || !document.body) return;
    this.observer = new MutationObserver(() => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.run(), 250);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  },

  bindGlobalListeners() {
    if (this.globalListenersBound) return;
    this.globalListenersBound = true;

    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("dblclick", (e) => this.handleDblClick(e));
    window.addEventListener("scroll", () => this.handleScroll(), {
      passive: true,
    });
    window.addEventListener("resize", () => this.handleResize(), {
      passive: true,
    });
  },

  getPageContext() {
    const url = window.location.href;
    const path = window.location.pathname || "/";
    const isReader = url.includes("/chapter/");
    const isSeriesListing = /\/series(\?|$)/.test(url);
    const isSeriesPage = /\/series\/[^/?#]+/.test(url) && !isReader;
    const isAuthPage = /^\/(login|signup|forgot-password|reset-password)(\/|$)/.test(
      path
    );
    return { isReader, isSeriesPage, isSeriesListing, isAuthPage };
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
    this.cleanupCompactSidebar();
    this.cleanupHomeSections();
    this.syncReaderState();
    this.maybeRunChapterEndAction();
  },

  mountReaderUI() {
    this.reader.start();

    this.dockView.mount({
      toggleScroll: () => this.reader.toggleScroll(),
      setSpeed: (value) => this.reader.setSpeed(value),
      stepSpeed: (delta) => this.reader.stepSpeed(delta),
      setWidth: (value) => this.reader.setWidth(value),
      stepWidth: (delta) => this.reader.stepWidth(delta),
      toggleFitWidth: () => this.reader.toggleFitWidth(),
      navigate: (direction) => this.reader.navigate(direction),
      goSeries: () => this.reader.goSeries(),
      goTop: () => this.reader.goTop(),
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

  syncReaderState(state) {
    if (!this.pageContext.isReader || !this.readerMounted) return;
    const snapshot = state || this.reader.getStateSnapshot();

    this.dockView.sync(snapshot);

    if (ConfigStore.get("showProgressBar")) {
      this.progressBarView.mount();
      this.progressBarView.update(snapshot.progress);
    } else {
      this.progressBarView.unmount();
    }
  },

  applyBodyClasses() {
    const body = document.body;
    if (!body) return;

    body.classList.add("au-theme-enabled");
    body.classList.toggle("au-hide-slider", !!ConfigStore.get("hideSlider"));
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
    body.classList.toggle(
      "au-menu-series-overhaul",
      !!ConfigStore.get("menuSeriesOverhaul")
    );
    body.classList.toggle(
      "au-page-series",
      this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing
    );
    body.classList.toggle("au-page-reader", this.pageContext.isReader);
    body.classList.toggle("au-page-auth", this.pageContext.isAuthPage);
  },

  applyOverhaulTargets() {
    this.clearOverhaulTargets();

    this.tagHeaderOverhaulTargets();
    if (this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing) {
      this.tagSeriesOverhaulTargets();
    }
  },

  clearOverhaulTargets() {
    const markerClasses = [
      "au-overhaul-header",
      "au-overhaul-header-inner",
      "au-overhaul-nav-link",
      "au-overhaul-search",
      "au-overhaul-auth-btn",
      "au-series-breadcrumb",
      "au-series-card",
      "au-series-synopsis",
      "au-series-meta",
      "au-series-chapters",
      "au-series-chapter-jump",
      "au-series-chapter-row",
      "au-series-comments",
      "au-series-related",
    ];
    const selector = markerClasses.map((cls) => `.${cls}`).join(",");
    document.querySelectorAll(selector).forEach((el) => {
      markerClasses.forEach((cls) => el.classList.remove(cls));
    });
  },

  tagHeaderOverhaulTargets() {
    const header = document.querySelector("header.bg-themecolor");
    if (!header) return;

    header.classList.add("au-overhaul-header");

    const inner =
      header.querySelector('div[class*="max-w-[1220px]"]') ||
      header.firstElementChild;
    if (inner) inner.classList.add("au-overhaul-header-inner");

    header
      .querySelectorAll("ul li a span, ul li a")
      .forEach((el) => el.classList.add("au-overhaul-nav-link"));

    const searchInput =
      header.querySelector('input[placeholder*="Search"]') ||
      header.querySelector('input[type="search"]') ||
      header.querySelector("input[type='text']");
    if (searchInput) searchInput.classList.add("au-overhaul-search");

    header
      .querySelectorAll('a[href*="/login"], a[href*="/dashboard"]')
      .forEach((anchor) => {
        const btn = anchor.querySelector("button");
        if (btn) btn.classList.add("au-overhaul-auth-btn");
      });
  },

  tagSeriesOverhaulTargets() {
    const divs = Array.from(document.querySelectorAll("div"));
    const textOf = (el) => (el.textContent || "").trim().toLowerCase();

    const breadcrumb = divs.find(
      (el) =>
        this.hasClassSnippets(el, ["bg-[#222222]", "px-5", "py-2.5"]) &&
        textOf(el).includes("asura scans")
    );
    if (breadcrumb) breadcrumb.classList.add("au-series-breadcrumb");

    const seriesCard = divs.find(
      (el) =>
        this.hasClassSnippets(el, ["bg-[#222222]"]) &&
        /synopsis|bookmark|followed by|keywords/i.test(el.textContent || "")
    );
    if (seriesCard) seriesCard.classList.add("au-series-card");

    const synopsisHeading = Array.from(document.querySelectorAll("h3")).find((h) =>
      /^synopsis/i.test((h.textContent || "").trim())
    );
    if (synopsisHeading) {
      const synopsisBlock = synopsisHeading.closest("div");
      if (synopsisBlock) synopsisBlock.classList.add("au-series-synopsis");
    }

    const metaScope = seriesCard || document.body;
    Array.from(metaScope.querySelectorAll("div"))
      .filter((el) => {
        const txt = textOf(el);
        if (!txt) return false;
        const hasTargetText =
          txt.includes("status") ||
          txt.includes("type") ||
          txt.includes("bookmark") ||
          txt.includes("followed by");
        return hasTargetText && txt.length < 700;
      })
      .slice(0, 4)
      .forEach((el) => el.classList.add("au-series-meta"));

    const chapterHeader = divs.find(
      (el) =>
        this.hasClassSnippets(el, ["border-b-[1px]", "border-[#312f40]"]) &&
        /^chapter\b/i.test((el.textContent || "").trim())
    );
    const chapterContainer = chapterHeader && chapterHeader.parentElement;
    if (chapterContainer) chapterContainer.classList.add("au-series-chapters");

    divs
      .filter((el) => {
        const txt = (el.textContent || "").toLowerCase();
        if (!txt || !/(first|new|latest|last)\s+chapter/.test(txt)) return false;
        if (!this.hasClassSnippets(el, ["rounded-sm"])) return false;
        const chapterAnchor = el.closest('a[href*="/chapter/"]');
        return !!chapterAnchor;
      })
      .forEach((el) => el.classList.add("au-series-chapter-jump"));

    divs
      .filter(
        (el) =>
          this.hasClassSnippets(el, ["pl-4", "py-2", "rounded-md"]) &&
          /chapter\s*\d+/i.test(el.textContent || "")
      )
      .forEach((el) => el.classList.add("au-series-chapter-row"));

    const commentsHeading = Array.from(document.querySelectorAll("h3")).find(
      (h) => (h.textContent || "").trim().toLowerCase() === "comments"
    );
    const commentsContainer = commentsHeading
      ? commentsHeading.closest(".bg-comments-background")
      : null;
    if (commentsContainer) commentsContainer.classList.add("au-series-comments");

    const relatedHeading = Array.from(document.querySelectorAll("h3")).find(
      (h) => (h.textContent || "").trim().toLowerCase() === "related series"
    );
    const relatedContainer = relatedHeading
      ? relatedHeading.closest(".bg-comments-background")
      : null;
    if (relatedContainer) relatedContainer.classList.add("au-series-related");
  },

  handleConfigChanged(key) {
    if (key === "themePreset") {
      ThemeController.apply(ConfigStore.get("themePreset"));
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

    if (key === "hasPremiumAccess") {
      this.chapterAccessCache = new Map();
    }

    this.applyBodyClasses();
    this.run();
  },

  handleScroll() {
    if (!this.pageContext.isReader) return;
    this.maybeRunChapterEndAction();
    if (!this.readerMounted) return;
    this.syncReaderState();
  },

  handleResize() {
    this.cleanupCompactSidebar();
    if (!this.pageContext.isReader) return;
    this.maybeRunChapterEndAction();
    if (!this.readerMounted) return;
    this.syncReaderState();
  },

  getReaderChapterKey() {
    return `${window.location.pathname || ""}${window.location.search || ""}`;
  },

  refreshEndActionChapterState() {
    const chapterKey = this.pageContext.isReader ? this.getReaderChapterKey() : "";
    if (chapterKey === this.endActionChapterKey) return;
    this.endActionChapterKey = chapterKey;
    this.endActionCompleted = false;
    this.endActionInFlight = false;
  },

  isNearPageEnd() {
    const contentEndY = this.reader && this.reader.getChapterContentEndY
      ? this.reader.getChapterContentEndY()
      : null;
    if (Number.isFinite(contentEndY) && contentEndY > 0) {
      const viewportBottom = window.scrollY + window.innerHeight;
      const threshold = Math.max(160, Math.round(window.innerHeight * 0.12));
      return viewportBottom >= contentEndY - threshold;
    }

    const root = document.documentElement;
    if (!root) return false;
    const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
    if (maxScroll <= 1) return false;
    const remaining = maxScroll - window.scrollY;
    const fallbackThreshold = Math.max(220, Math.round(window.innerHeight * 0.2));
    return remaining <= fallbackThreshold;
  },

  getChapterImageCount(root = document) {
    if (!root || !root.querySelectorAll) return 0;
    const primaryCount = root.querySelectorAll(".w-full.mx-auto.center img").length;
    if (primaryCount > 0) return primaryCount;
    const fallbackImages = root.querySelectorAll(
      'img[src*="/storage/media/"],img[src*="/storage/comics/"],img[src*="/comics/"]'
    );
    return fallbackImages.length;
  },

  hasPremiumLockSignals(root = document) {
    if (!root) return false;
    const textSource = root.body?.textContent || root.textContent || "";
    const bodyText = textSource.toLowerCase();
    const premiumPhrases = [
      "chapter is locked",
      "this chapter is locked",
      "premium chapter",
      "premium only",
      "unlock chapter",
      "members only chapter",
      "for premium members",
    ];
    const hasPremiumText = premiumPhrases.some((token) => bodyText.includes(token));
    if (!hasPremiumText) return false;

    const ctaNodes = Array.from(root.querySelectorAll?.("button,a") || []);
    const hasUnlockCta = ctaNodes.some((node) => {
      const txt = (node.textContent || "").trim().toLowerCase();
      return txt.includes("unlock") || txt.includes("premium");
    });

    const hasPremiumUi = !!root.querySelector?.(
      '[class*="premium"],[id*="premium"],[class*="locked"],[id*="locked"]'
    );

    return hasUnlockCta || hasPremiumUi || hasPremiumText;
  },

  isLikelyPremiumLockedCurrentChapter() {
    const chapterImageCount = this.getChapterImageCount(document);
    if (chapterImageCount > 0) return false;
    return this.hasPremiumLockSignals(document);
  },

  showEndActionHint(message) {
    const now = Date.now();
    if (now - this.endActionHintTs < 2400) return;
    this.endActionHintTs = now;
    this.showHint(message);
  },

  async maybeRunChapterEndAction() {
    if (!this.pageContext.isReader) return;

    const actionMode = ConfigStore.get("chapterEndAction");
    if (!actionMode || actionMode === "off") return;

    this.refreshEndActionChapterState();
    if (this.endActionCompleted || this.endActionInFlight) return;
    if (!this.isNearPageEnd()) return;

    if (!ConfigStore.get("hasPremiumAccess") && this.isLikelyPremiumLockedCurrentChapter()) {
      this.endActionCompleted = true;
      this.showEndActionHint("End Action skipped: Premium-locked chapter detected");
      return;
    }

    this.endActionInFlight = true;
    try {
      const handled = await this.performSmartEndAction(actionMode);
      if (handled) this.endActionCompleted = true;
    } finally {
      this.endActionInFlight = false;
    }
  },

  async probeChapterAccess(url) {
    if (ConfigStore.get("hasPremiumAccess")) {
      return { allowed: true, reason: "has_premium_access" };
    }

    const targetUrl = String(url || "").trim();
    if (!targetUrl) return { allowed: false, reason: "missing_url" };

    if (this.chapterAccessCache.has(targetUrl)) {
      return this.chapterAccessCache.get(targetUrl);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);

    let result;
    try {
      const response = await fetch(targetUrl, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) {
        result = { allowed: true, reason: "request_failed_allow" };
      } else {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const chapterImageCount = this.getChapterImageCount(doc);
        if (chapterImageCount > 0) {
          result = { allowed: true, reason: "reader_images_present" };
        } else {
          const hasPremiumSignals = this.hasPremiumLockSignals(doc);
          result = {
            allowed: !hasPremiumSignals,
            reason: hasPremiumSignals ? "premium_locked" : "inconclusive_allow",
          };
        }
      }
    } catch (_error) {
      result = { allowed: true, reason: "request_error_allow" };
    } finally {
      window.clearTimeout(timeout);
    }

    this.chapterAccessCache.set(targetUrl, result);
    return result;
  },

  async tryNavigateNextChapterWithPremiumCheck() {
    const nextTarget = this.reader.getChapterNavTarget("next");
    if (!nextTarget || !nextTarget.href) return false;

    const access = await this.probeChapterAccess(nextTarget.href);
    if (!access.allowed) {
      this.showEndActionHint("End Action: Next chapter blocked (premium lock)");
      return false;
    }

    nextTarget.click();
    return true;
  },

  stopReaderAutoScrollForEndAction() {
    if (!this.reader) return;
    if (!this.reader.isScrolling()) return false;
    this.reader.stopScroll();
    this.reader.emitState();
    return true;
  },

  async performSmartEndAction(actionMode) {
    if (actionMode === "stopScroll") {
      const stopped = this.stopReaderAutoScrollForEndAction();
      if (!stopped) return false;
      this.showEndActionHint("End Action: Auto-scroll stopped");
      return true;
    }

    if (actionMode === "seriesPage") {
      if (this.reader.goSeries()) {
        return true;
      }
      if (await this.tryNavigateNextChapterWithPremiumCheck()) {
        return true;
      }
      this.stopReaderAutoScrollForEndAction();
      this.showEndActionHint("End Action: No destination");
      return true;
    }

    if (actionMode === "nextChapter") {
      if (await this.tryNavigateNextChapterWithPremiumCheck()) {
        return true;
      }
      if (this.reader.goSeries()) {
        this.showEndActionHint("End Action: Falling back to series page");
        return true;
      }
      this.stopReaderAutoScrollForEndAction();
      this.showEndActionHint("End Action: No destination");
      return true;
    }

    return false;
  },

  handleKeyDown(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest("#au-modal-overlay")) {
      return;
    }

    const context = this.getPageContext();
    const key = typeof e.key === "string" ? e.key : "";
    const code = e.code || "";
    const matchesConfig = (configKey, legacy = false) =>
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
          this.reader.toggleScroll();
        }
        return;
      }

      if (matchesConfig("keybindSpeedUp", speedUpLegacy)) {
        if (readerEnabled) this.reader.stepSpeed(CONSTANTS.SPEED_STEP);
        return;
      }

      if (matchesConfig("keybindSpeedDown", speedDownLegacy)) {
        if (readerEnabled) this.reader.stepSpeed(-CONSTANTS.SPEED_STEP);
        return;
      }

      if (matchesConfig("keybindNextChapter", nextLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          this.reader.navigate("next");
        }
        return;
      }

      if (matchesConfig("keybindPrevChapter", prevLegacy)) {
        if (readerEnabled) {
          e.preventDefault();
          this.reader.navigate("prev");
        }
        return;
      }

      if (matchesConfig("keybindGoSeries")) {
        if (readerEnabled) this.reader.goSeries();
        return;
      }

      if (matchesConfig("keybindToggleFitWidth")) {
        if (readerEnabled) this.reader.toggleFitWidth();
        return;
      }
    }

    if (context.isSeriesPage) {
      if (matchesConfig("keybindFocusSearch")) {
        e.preventDefault();
        this.focusSearch();
        return;
      }
      if (matchesConfig("keybindJumpChapters")) {
        e.preventDefault();
        this.scrollToChapterList();
        return;
      }
    }
  },

  handleDblClick(e) {
    if (!this.pageContext.isReader) return;
    if (!ConfigStore.get("readerWidget")) return;
    if (!ConfigStore.get("doubleClickScroll")) return;

    const target = e.target;
    if (!target || !target.closest) return;
    if (target.closest("#au-reader-dock-shell")) return;
    if (target.closest("#au-modal-overlay")) return;

    this.reader.toggleScroll();
  },

  focusSearch() {
    const searchInput =
      document.querySelector('input[placeholder*="Search"]') ||
      document.querySelector('input[type="search"]') ||
      document.querySelector(".series-search input");

    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  scrollToChapterList() {
    const headings = Array.from(document.querySelectorAll("h2, h3, h4"));
    const chapterHeading = headings.find((h) =>
      (h.textContent || "").toLowerCase().includes("chapter")
    );

    const chapterSection =
      chapterHeading ||
      document.querySelector('[class*="chapter"]') ||
      document.querySelector("div.chapter");

    const firstChapter = document.querySelector('a[href*="/chapter/"]');
    const target = chapterSection || (firstChapter && firstChapter.closest("div"));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  showHint(message) {
    let hint = document.getElementById("au-shortcut-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "au-shortcut-hint";
      hint.className = "au-shortcut-hint";
      document.body.appendChild(hint);
    }

    hint.textContent = message;
    hint.classList.add("visible");
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => hint.classList.remove("visible"), 1000);
  },

  hasClasses(el, classes) {
    return !!el && !!el.classList && classes.every((c) => el.classList.contains(c));
  },

  hasClassSnippets(el, snippets) {
    if (!el || typeof el.className !== "string") return false;
    return snippets.every((snippet) => el.className.includes(snippet));
  },

  findAncestor(el, predicate) {
    let cur = el;
    while (cur && cur !== document.body) {
      if (predicate(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  },

  findHomeSlider() {
    const normalizeSliderTarget = (node) => {
      if (!node || !node.querySelector) return node || null;

      const loopNode =
        node.matches("div.loop.owl-carousel.full") ?
          node :
          node.querySelector("div.loop.owl-carousel.full");
      if (loopNode) return loopNode.closest("div.overflow-hidden") || loopNode;

      const carouselNode =
        node.matches("div.carousel-root, div.carousel.carousel-slider") ?
          node :
          node.querySelector("div.carousel-root, div.carousel.carousel-slider");
      if (carouselNode) {
        return (
          carouselNode.closest("div.overflow-hidden") ||
          carouselNode.closest("div.carousel-root") ||
          carouselNode
        );
      }

      // Avoid broad wrappers that can span most of the page.
      const nestedOverflow = node.querySelector("div.overflow-hidden");
      if (nestedOverflow && node.classList && node.classList.contains("min-h-72")) {
        return nestedOverflow;
      }

      return node;
    };

    // Prefer explicit home-slider structures from the current Asura homepage markup.
    const explicitSlider = document.querySelector(
      "div.loop.owl-carousel.full, div.carousel-root, div.carousel.carousel-slider"
    );
    if (explicitSlider) {
      const explicitContainer = normalizeSliderTarget(explicitSlider);
      if (explicitContainer && explicitContainer !== document.body) {
        return explicitContainer;
      }
    }

    const hasManyPosters = (el) =>
      el.querySelectorAll(
        'img[alt="poster"], img[src*="thumb"], img[src*="storage/media"]'
      ).length >= 4;
    const hasManySeriesLinks = (el) => {
      const count = el.querySelectorAll('a[href*="/series/"]').length;
      return count >= 4 && count <= 24;
    };
    const isReasonableSliderContainer = (el) => {
      if (!el || el === document.body || el === document.documentElement) return false;
      if (el.closest("header") || el.closest("footer")) return false;

      const rect = el.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;

      const minHeight = 120;
      const maxHeight = window.innerHeight * 1.35;
      const maxArea = window.innerWidth * window.innerHeight * 1.4;
      const area = rect.width * rect.height;

      if (rect.height < minHeight || rect.height > maxHeight) return false;
      if (area > maxArea) return false;
      return true;
    };

    const overflowCandidates = Array.from(
      document.querySelectorAll("div.overflow-hidden")
    ).filter(
      (el) =>
        hasManyPosters(el) &&
        hasManySeriesLinks(el) &&
        isReasonableSliderContainer(el)
    );

    const candidates =
      overflowCandidates.length > 0
        ? overflowCandidates
        : Array.from(document.querySelectorAll("div")).filter(
            (el) =>
              hasManyPosters(el) &&
              hasManySeriesLinks(el) &&
              isReasonableSliderContainer(el)
          );
    if (candidates.length === 0) return null;

    const nearTop = candidates.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= -200 && rect.top < window.innerHeight * 1.5;
    });
    const pool = nearTop.length > 0 ? nearTop : candidates;

    const best = pool.reduce((acc, el) => {
      if (!acc) return el;
      const aRect = acc.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      return eRect.width > aRect.width ? el : acc;
    }, null);
    return normalizeSliderTarget(best);
  },

  findTorakaPromos() {
    const anchors = Array.from(document.querySelectorAll('a[href*="toraka.com"]'));
    const images = Array.from(
      document.querySelectorAll('img[src*="toraka"], img[alt*="Toraka"]')
    );
    const nodes = anchors.concat(images);
    const targets = new Set();

    nodes.forEach((node) => {
      const candidate = this.findAncestor(node, (el) => {
        if (!el || !el.querySelectorAll) return false;
        if (el.closest && el.closest("footer")) return false;
        const text = (el.textContent || "").toLowerCase();
        const hasTorakaText = text.includes("toraka");
        const linkCount = el.querySelectorAll('a[href*="toraka.com"]').length;
        const imgCount = el.querySelectorAll(
          'img[src*="toraka"], img[alt*="Toraka"]'
        ).length;
        return (
          (hasTorakaText && (linkCount >= 1 || imgCount >= 1)) ||
          (linkCount >= 1 && imgCount >= 1) ||
          (linkCount >= 2 && imgCount >= 1)
        );
      });
      if (candidate) targets.add(candidate);
    });

    return Array.from(targets);
  },

  findPopularSections() {
    const targets = new Set();
    const titlePattern =
      /\b(popular|trending|hot|most\s+(read|popular)|top\s+series)\b/i;
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, strong, span, p")
    );

    const maybeAddSectionForNode = (node) => {
      const txt = (node.textContent || "").trim().toLowerCase();
      if (!txt || txt.length > 120 || !titlePattern.test(txt)) return;
      const container = this.findAncestor(
        node,
        (el) => this.isLikelySeriesSection(el, { minLinks: 3 })
      );
      if (container) targets.add(container);
    };

    headings.forEach((h) => {
      maybeAddSectionForNode(h);
    });

    const hintedBlocks = Array.from(
      document.querySelectorAll(
        '[class*="popular"],[id*="popular"],[class*="trending"],[id*="trending"]'
      )
    );
    hintedBlocks.forEach((el) => {
      const container = this.findAncestor(
        el,
        (node) => this.isLikelySeriesSection(node, { minLinks: 3 })
      );
      if (container) targets.add(container);
    });

    return this.normalizeSectionTargets(Array.from(targets));
  },

  normalizeSectionTargets(nodes) {
    return nodes.filter(
      (el) => !nodes.some((other) => other !== el && other.contains(el))
    );
  },

  isLikelySeriesSection(el, options = {}) {
    const { minLinks = 3, maxLinks = 120 } = options;
    if (!el || !el.querySelectorAll) return false;
    if (el === document.body || el === document.documentElement) return false;
    if (el.closest("header") || el.closest("footer")) return false;
    const linkCount = el.querySelectorAll('a[href*="/series/"]').length;
    if (linkCount < minLinks || linkCount > maxLinks) return false;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width < 220 || rect.height < 80) return false;
    const maxArea = window.innerWidth * window.innerHeight * 1.8;
    if (rect.width * rect.height > maxArea) return false;
    return true;
  },

  isLikelySidebarColumn(el) {
    if (!el || !el.isConnected || !el.querySelectorAll) return false;
    if (el === document.body || el === document.documentElement) return false;
    if (el.closest("header") || el.closest("footer")) return false;
    if (el.closest("#au-reader-dock-shell")) return false;
    if (el.closest("#au-modal-overlay")) return false;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width < 180 || rect.height < 120) return false;
    if (rect.width > window.innerWidth * 0.45) return false;
    const className = typeof el.className === "string" ? el.className.toLowerCase() : "";
    const hasSidebarHint =
      el.tagName.toLowerCase() === "aside" ||
      className.includes("sidebar") ||
      className.includes("side-bar") ||
      className.includes("float-right");
    const rightAligned = rect.left >= window.innerWidth * 0.48;
    if (!hasSidebarHint && !rightAligned) return false;
    const linkCount = el.querySelectorAll('a[href*="/series/"]').length;
    if (linkCount < 4 || linkCount > 140) return false;
    return true;
  },

  findCompactSidebarTargets() {
    const targets = new Set();

    const explicitCandidates = Array.from(
      document.querySelectorAll(
        'aside,[class*="sidebar"],[class*="side-bar"],div[class*="float-right"]'
      )
    );
    explicitCandidates.forEach((el) => {
      if (this.isLikelySidebarColumn(el)) targets.add(el);
    });

    this.findPopularSections().forEach((section) => {
      const column = this.findAncestor(section, (el) => this.isLikelySidebarColumn(el));
      if (column) targets.add(column);
    });

    return this.normalizeSectionTargets(Array.from(targets));
  },

  cleanupCompactSidebar() {
    document
      .querySelectorAll(".au-compact-sidebar-target")
      .forEach((el) => el.classList.remove("au-compact-sidebar-target"));

    if (!ConfigStore.get("compactSidebar")) return;
    if (window.innerWidth < 980) return;

    this.findCompactSidebarTargets().forEach((el) => {
      el.classList.add("au-compact-sidebar-target");
    });
  },

  isLikelyBackToTopControl(el, allowNonFloating = false) {
    if (!el || !el.isConnected) return false;
    if (el.closest("#au-reader-dock-shell")) return false;
    if (el.closest("#au-modal-overlay")) return false;
    if (el.closest("#au-progress-bar")) return false;

    const style = window.getComputedStyle(el);
    const isFloating = style.position === "fixed" || style.position === "sticky";
    if (!allowNonFloating && !isFloating) return false;

    const rect = el.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;

    const nearBottom = window.innerHeight - rect.bottom <= 140;
    const nearEdge =
      window.innerWidth - rect.right <= 140 || rect.left <= 140;
    const isControlSize = rect.width <= 160 && rect.height <= 160;
    if (!allowNonFloating && (!nearBottom || !nearEdge || !isControlSize)) {
      return false;
    }

    const className = typeof el.className === "string" ? el.className.toLowerCase() : "";
    const id = (el.id || "").toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();
    const text = (el.textContent || "").toLowerCase();

    const hasBackToTopHint =
      className.includes("back-to-top") ||
      className.includes("scroll-to-top") ||
      className.includes("scrolltotop") ||
      className.includes("scroll_to_top") ||
      id.includes("back-to-top") ||
      id.includes("scroll-to-top") ||
      id.includes("scrolltotop") ||
      id.includes("scroll_to_top") ||
      aria.includes("back to top") ||
      aria.includes("scroll to top") ||
      title.includes("back to top") ||
      title.includes("scroll to top") ||
      text.includes("back to top");

    const hasUpIcon = !!el.querySelector(
      'svg[class*="chevron-up"],svg[class*="arrow-up"],svg[class*="arrow-big-up"],svg[class*="chevrons-up"]'
    );

    return hasBackToTopHint || hasUpIcon;
  },

  findBackToTopTargets() {
    const targets = new Set();

    const explicitSelectors = [
      '[class*="back-to-top"]',
      '[id*="back-to-top"]',
      'a[class*="scroll-to-top"]',
      '[class*="scrollToTop"]',
      '[class*="scrolltotop"]',
      '[class*="scroll_to_top"]',
      '[id*="scrollToTop"]',
      '[id*="scrolltotop"]',
      '[id*="scroll_to_top"]',
      '[aria-label*="back to top" i]',
      '[aria-label*="scroll to top" i]',
      '[title*="back to top" i]',
      '[title*="scroll to top" i]',
    ].join(",");

    document.querySelectorAll(explicitSelectors).forEach((el) => {
      if (this.isLikelyBackToTopControl(el, true)) targets.add(el);
    });

    const upIcons = document.querySelectorAll(
      'svg[class*="chevron-up"],svg[class*="arrow-up"],svg[class*="arrow-big-up"],svg[class*="chevrons-up"]'
    );

    upIcons.forEach((icon) => {
      const control =
        icon.closest("button,a,[role='button']") ||
        icon.closest("div") ||
        null;
      if (!control) return;

      const floatingAncestor = this.findAncestor(control, (node) => {
        if (!node || node === document.body) return false;
        const nodeStyle = window.getComputedStyle(node);
        return nodeStyle.position === "fixed" || nodeStyle.position === "sticky";
      });

      const candidate = floatingAncestor || control;
      if (this.isLikelyBackToTopControl(candidate)) {
        targets.add(candidate);
      }
    });

    return Array.from(targets);
  },

  cleanupBackToTopControl() {
    document
      .querySelectorAll(".au-hide-btt-target")
      .forEach((el) => el.classList.remove("au-hide-btt-target"));

    if (!ConfigStore.get("hideDefaultBackToTop")) return;

    this.findBackToTopTargets().forEach((el) =>
      el.classList.add("au-hide-btt-target")
    );
  },

  cleanupHomeSections() {
    document
      .querySelectorAll(".au-hide-toraka-target")
      .forEach((el) => el.classList.remove("au-hide-toraka-target"));
    if (ConfigStore.get("hideToraka")) {
      this.findTorakaPromos().forEach((el) =>
        el.classList.add("au-hide-toraka-target")
      );
    }

    const path = window.location.pathname || "/";
    const isHome = path === "/" || path === "" || path.startsWith("/page/");
    document
      .querySelectorAll(".au-hide-popular-target")
      .forEach((el) => el.classList.remove("au-hide-popular-target"));

    if (ConfigStore.get("hidePopularSection")) {
      this.findPopularSections().forEach((el) => el.classList.add("au-hide-popular-target"));
    }

    document
      .querySelectorAll(".au-hide-slider-target")
      .forEach((el) => el.classList.remove("au-hide-slider-target"));
    if (!isHome) return;

    if (ConfigStore.get("hideSlider")) {
      const slider = this.findHomeSlider();
      if (slider) slider.classList.add("au-hide-slider-target");
    }
  },
};
