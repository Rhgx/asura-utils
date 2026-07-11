import { CONSTANTS } from "../config/defaults.js";
import { matchesBinding } from "../config/keybinds.js";
import { ConfigStore } from "../store/configStore.js";
import { ThemeController } from "../theme/themeController.js";
import { ProgressBarView } from "../views/progressBarView.js";
import { ReaderDockView } from "../views/readerDockView.js";
import { SettingsModalView } from "../views/settingsModalView.js";
import { ReaderController } from "./readerController.js";

const SERIES_LINK_SELECTOR = 'a[href*="/comics/"],a[href*="/series/"]';
const CHAPTER_LINK_SELECTOR = 'a[href*="/chapter/"]';
const CHAPTER_IMAGE_SELECTOR = [
  ".w-full.mx-auto.center img",
  'img[src*="/asura-images/chapters/"]',
  'img[data-src*="/asura-images/chapters/"]',
  'img[data-loaded-src*="/asura-images/chapters/"]',
  'img[srcset*="/asura-images/chapters/"]',
  'img[src*="/storage/media/"]',
  'img[src*="/storage/comics/"]',
].join(",");

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
    const path = window.location.pathname || "/";
    const isReader = /\/chapter\/[^/?#]+/.test(path);
    const isSeriesListing = /^\/(browse|series)(\/|$)/.test(path);
    const isSeriesPage = /^\/(comics|series)\/[^/?#]+/.test(path) && !isReader;
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
    this.cleanupBetaBanner();
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
    body.classList.toggle(
      "au-menu-series-overhaul",
      !!ConfigStore.get("menuSeriesOverhaul")
    );
    body.classList.toggle(
      "au-page-series",
      this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing
    );
    body.classList.toggle("au-page-listing", this.pageContext.isSeriesListing);
    body.classList.toggle("au-page-reader", this.pageContext.isReader);
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

  applyOverhaulTargets() {
    this.clearOverhaulTargets();

    this.tagHeaderOverhaulTargets();
    this.tagThemeTargets();
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
      "au-theme-dropdown-surface",
      "au-series-breadcrumb",
      "au-series-card",
      "au-series-synopsis",
      "au-series-meta",
      "au-series-chapters",
      "au-series-chapter-jump",
      "au-series-chapter-row",
      "au-series-comments",
      "au-series-related",
      "au-theme-site-section",
      "au-theme-muted-gradient",
      "au-theme-accent-text",
      "au-theme-accent-text-hover",
      "au-theme-accent-bg",
      "au-theme-accent-bg-soft",
      "au-theme-accent-bg-hover",
      "au-theme-accent-bg-soft-hover",
      "au-theme-accent-text-group-hover",
      "au-theme-accent-bg-group-hover",
      "au-theme-accent-ring-hover",
      "au-theme-accent-ring-focus",
      "au-theme-accent-focus-border",
      "au-theme-accent-gradient",
      "au-theme-card-surface",
      "au-theme-control-surface",
      "au-theme-accent-shadow",
      "au-theme-accent-shadow-hover",
    ];
    const selector = markerClasses.map((cls) => `.${cls}`).join(",");
    document.querySelectorAll(selector).forEach((el) => {
      markerClasses.forEach((cls) => el.classList.remove(cls));
    });
  },

  tagHeaderOverhaulTargets() {
    const header = document.querySelector("header");
    if (!header) return;

    header.classList.add("au-overhaul-header");

    const inner =
      Array.from(header.querySelectorAll("div")).find((el) => {
        const className = typeof el.className === "string" ? el.className : "";
        return (
          className.includes("max-w-[1220px]") ||
          className.includes("max-w-[1285px]") ||
          (className.includes("mx-auto") && className.includes("w-full"))
        );
      }) ||
      header.firstElementChild;
    if (inner) inner.classList.add("au-overhaul-header-inner");

    header
      .querySelectorAll("nav a, ul li a")
      .forEach((el) => el.classList.add("au-overhaul-nav-link"));

    const searchInput =
      header.querySelector('input[placeholder*="Search"]') ||
      header.querySelector('input[type="search"]') ||
      header.querySelector("input[type='text']");
    if (searchInput) searchInput.classList.add("au-overhaul-search");

    header
      .querySelectorAll('a[href*="/login"], a[href*="/dashboard"], a[href*="/account"]')
      .forEach((anchor) => {
        const btn = anchor.querySelector("button") || anchor;
        btn.classList.add("au-overhaul-auth-btn");
      });

    const resourcesMenu = Array.from(header.querySelectorAll("div")).find((el) =>
      Array.from(el.classList).includes("group/resources")
    );
    const resourcesDropdown = resourcesMenu
      ? Array.from(resourcesMenu.children).find((el) =>
          Array.from(el.classList).some((token) => token === "bg-[#1C1924]")
        )
      : null;
    if (resourcesDropdown) {
      resourcesDropdown.classList.add("au-theme-dropdown-surface");
    }
  },

  tagThemeTargets() {
    const componentNames = [
      "TrendingSection",
      "LatestUpdates",
      "PopularSidebar",
      "AnnouncementsSection",
      "ChapterListReact",
      "CommentsSection",
      "Recommended",
      "BrowseFilters",
      "NovelStore",
    ];
    const selector = componentNames
      .map((name) => `astro-island[component-url*="${name}"]`)
      .join(",");

    const themeRoots = Array.from(document.querySelectorAll(selector));
    const footer = document.querySelector("footer");
    if (footer) themeRoots.push(footer);
    const path = window.location.pathname || "/";
    if (/^\/(series-ranking|leaderboard)(\/|$)/.test(path)) {
      const main = document.querySelector("main");
      if (main) themeRoots.push(main);
    }

    themeRoots.forEach((island) => {
      const componentUrl =
        island.getAttribute("component-url") ||
        (island.tagName === "MAIN" ? "PageScope" : "");
      const candidates = Array.from(
        island.querySelectorAll("section, aside, article, div")
      );
      const target =
        (/BrowseFilters|NovelStore|PageScope/.test(componentUrl) ? island : null) ||
        candidates.find((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect || rect.width < 220 || rect.height < 80) return false;
          const background = window.getComputedStyle(el).backgroundColor;
          return background && background !== "transparent" && background !== "rgba(0, 0, 0, 0)";
        }) ||
        island.firstElementChild ||
        island.parentElement;
      if (target && target !== document.body && target !== document.documentElement) {
        target.classList.add("au-theme-site-section");
        Array.from(target.querySelectorAll("[class]")).forEach((el) => {
          const tokens = Array.from(el.classList);
          const isAccentToken = (token) =>
            /(?:\[#(?:913fe2|8e3fdd|7c35c2|7c3aed|7b35c1|7b2fd1|6f2598|5a1f78|a78bfa|c084fc)\]|(?:purple|violet|fuchsia)-)/i.test(
              token
            );

          if (tokens.some((token) => /^text-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-text");
          }
          if (tokens.some((token) => /^hover:text-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-text-hover");
          }
          if (tokens.some((token) => /^group-hover:text-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-text-group-hover");
          }
          if (
            tokens.some(
              (token) =>
                /^group-hover:bg-/.test(token) && !token.includes("/") && isAccentToken(token)
            )
          ) {
            el.classList.add("au-theme-accent-bg-group-hover");
          }
          if (
            tokens.some(
              (token) => /^bg-/.test(token) && !token.includes("/") && isAccentToken(token)
            )
          ) {
            el.classList.add("au-theme-accent-bg");
          }
          if (
            tokens.some(
              (token) => /^bg-/.test(token) && token.includes("/") && isAccentToken(token)
            )
          ) {
            el.classList.add("au-theme-accent-bg-soft");
          }
          if (
            tokens.some(
              (token) =>
                /^hover:bg-/.test(token) && !token.includes("/") && isAccentToken(token)
            )
          ) {
            el.classList.add("au-theme-accent-bg-hover");
          }
          if (
            tokens.some(
              (token) =>
                /^hover:bg-/.test(token) && token.includes("/") && isAccentToken(token)
            )
          ) {
            el.classList.add("au-theme-accent-bg-soft-hover");
          }
          if (tokens.some((token) => /^hover:ring-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-ring-hover");
          }
          if (tokens.some((token) => /^focus:ring-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-ring-focus");
          }
          if (tokens.some((token) => /^shadow-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-shadow");
          }
          if (
            !tokens.some((token) => /^hover:ring-/.test(token) && isAccentToken(token)) &&
            tokens.some((token) => /^hover:shadow-/.test(token) && isAccentToken(token))
          ) {
            el.classList.add("au-theme-accent-shadow-hover");
          }
          if (tokens.some((token) => /^focus-within:border-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-focus-border");
          }
          if (tokens.some((token) => /^(?:from|via|to)-/.test(token) && isAccentToken(token))) {
            el.classList.add("au-theme-accent-gradient");
          }
        });
        if (componentUrl.includes("BrowseFilters")) {
          target.querySelectorAll(".series-card").forEach((card) => {
            card.classList.add("au-theme-card-surface");
          });
          target
            .querySelectorAll(
              'button[class*="bg-[#1f1a2e]"], label[class*="bg-[#1f1a2e]"]'
            )
            .forEach((control) => {
              control.classList.add("au-theme-control-surface");
            });
        }
        if (componentUrl.includes("ChapterListReact")) {
          target.querySelectorAll("input, button, select").forEach((control) => {
            const tokens = Array.from(control.classList);
            if (
              tokens.some(
                (token) => token === "bg-[#13111A]" || token === "bg-[#1C1924]"
              )
            ) {
              control.classList.add("au-theme-control-surface");
            }
          });
        }
        Array.from(target.querySelectorAll("div, article, a")).forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect || rect.width < 220 || rect.height < 80) return;
          const backgroundImage = window.getComputedStyle(el).backgroundImage;
          if (backgroundImage && backgroundImage.includes("gradient")) {
            el.classList.add("au-theme-muted-gradient");
          }
        });
      }
    });
  },

  tagSeriesOverhaulTargets() {
    const textOf = (el) => (el.textContent || "").trim().toLowerCase();
    const chapterAnchors = this.getChapterAnchors(document);
    const chapterRows = chapterAnchors.filter((anchor) => {
      const txt = textOf(anchor);
      return /chapter\s*\d+/i.test(txt) && !/(first|latest)\s+chapter/i.test(txt);
    });
    const seriesCardArticle =
      Array.from(document.querySelectorAll("article")).find((el) => {
        const txt = textOf(el);
        return (
          txt.includes("bookmark") ||
          txt.includes("status") ||
          txt.includes("author") ||
          txt.includes("artist")
        );
      }) || document.querySelector("main article");
    const seriesCard = seriesCardArticle?.parentElement || seriesCardArticle;

    const breadcrumb = Array.from(document.querySelectorAll("nav,div,section")).find(
      (el) => {
        const links = Array.from(el.querySelectorAll("a"));
        if (links.length < 2 || links.length > 6) return false;
        const hrefs = links.map((anchor) => anchor.getAttribute("href") || anchor.href || "");
        const hasHome = hrefs.some(
          (href) => href === "/" || /^https?:\/\/[^/]+\/?$/.test(href)
        );
        const hasBrowse = hrefs.some(
          (href) => href.includes("/browse") || href.includes("/series")
        );
        const hasSeries = hrefs.some(
          (href) => /\/(comics|series)\//.test(href) && !href.includes("/chapter/")
        );
        return hasHome && hasBrowse && hasSeries && textOf(el).length < 220;
      }
    );
    if (breadcrumb) breadcrumb.classList.add("au-series-breadcrumb");

    if (seriesCard) seriesCard.classList.add("au-series-card");

    const synopsisBlock =
      document.getElementById("description-text")?.parentElement ||
      Array.from(document.querySelectorAll("div,section")).find((el) => {
        const txt = textOf(el);
        return (
          txt.length > 140 &&
          txt.length < 2200 &&
          (el.querySelector("#description-text") ||
            el.querySelector("#expand-description") ||
            txt.includes("fate did not let him go"))
        );
      });
    if (synopsisBlock) synopsisBlock.classList.add("au-series-synopsis");

    const metaScope = seriesCard || document.body;
    Array.from(metaScope.querySelectorAll("div"))
      .filter((el) => {
        const txt = textOf(el);
        if (!txt) return false;
        const hasTargetText =
          txt.includes("rating") ||
          txt.includes("chapters") ||
          txt.includes("author") ||
          txt.includes("artist") ||
          txt.includes("genre") ||
          txt.includes("status") ||
          txt.includes("type") ||
          txt.includes("bookmark") ||
          txt.includes("followed by");
        return hasTargetText && txt.length < 700;
      })
      .slice(0, 8)
      .forEach((el) => el.classList.add("au-series-meta"));

    const chapterListIsland = document.querySelector(
      'astro-island[component-url*="ChapterListReact"]'
    );
    const chapterContainer =
      chapterListIsland?.closest("div.mt-4") ||
      this.findAncestor(chapterRows[0], (el) => this.getChapterAnchors(el).length >= 6) ||
      this.findAncestor(chapterAnchors[0], (el) => this.getChapterAnchors(el).length >= 6);
    if (chapterContainer) chapterContainer.classList.add("au-series-chapters");

    chapterAnchors
      .filter((anchor) => /(first|latest)\s+chapter/i.test(anchor.textContent || ""))
      .forEach((anchor) => anchor.classList.add("au-series-chapter-jump"));

    chapterRows.forEach((anchor) => anchor.classList.add("au-series-chapter-row"));

    const commentsIsland = document.querySelector(
      'astro-island[component-url*="CommentsSection"], astro-island[component-url*="Comments"]'
    );
    const commentsContainer =
      commentsIsland?.closest(".mt-6") || commentsIsland?.firstElementChild || null;
    if (commentsContainer) commentsContainer.classList.add("au-series-comments");

    const relatedHeading = Array.from(document.querySelectorAll("h2, h3, h4")).find((h) =>
      /related\s+series|you\s+may\s+also\s+like/i.test(h.textContent || "")
    );
    const relatedContainer = relatedHeading
      ? this.findAncestor(relatedHeading, (el) => this.getSeriesAnchors(el).length >= 3)
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
    const primaryCount = root.querySelectorAll(CHAPTER_IMAGE_SELECTOR).length;
    if (primaryCount > 0) return primaryCount;
    const chapterReaderIsland = root.querySelector?.(
      'astro-island[component-url*="ChapterReader"]'
    );
    const readerProps = chapterReaderIsland?.getAttribute?.("props") || "";
    return readerProps.includes("/asura-images/chapters/") ? 1 : 0;
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
      document.querySelector("#browse-interactive input") ||
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
      document.querySelector('astro-island[component-url*="ChapterListReact"]') ||
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

  getSeriesAnchors(root = document, options = {}) {
    const { includeChapters = false } = options;
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll(SERIES_LINK_SELECTOR)).filter((anchor) => {
      const href = anchor.getAttribute("href") || anchor.href || "";
      if (!href) return false;
      return includeChapters || !href.includes("/chapter/");
    });
  },

  getChapterAnchors(root = document) {
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll(CHAPTER_LINK_SELECTOR)).filter((anchor) => {
      const href = anchor.getAttribute("href") || anchor.href || "";
      return /\/chapter\//.test(href);
    });
  },

  findHomeSlider() {
    const normalizeSliderTarget = (node) => {
      if (!node || !node.querySelector) return node || null;
      if (node.tagName === "ASTRO-ISLAND") {
        const islandHero =
          node.querySelector(".hero-section-embla, .embla-hero") || node.firstElementChild;
        if (islandHero) node = islandHero;
      }

      const emblaHero =
        node.matches(".hero-section-embla, .embla-hero") ?
          node :
          node.querySelector?.(".hero-section-embla, .embla-hero");
      if (emblaHero) {
        return emblaHero.closest(".hero-section-embla") || emblaHero;
      }

      const heroNode =
        node.matches('[component-url*="HeroCarousel"],[class*="hero-carousel"]') ?
          node :
          node.querySelector?.('[component-url*="HeroCarousel"],[class*="hero-carousel"]');
      if (heroNode) return heroNode.firstElementChild || heroNode;

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
      'astro-island[component-url*="HeroCarousel"], .hero-section-embla, .embla-hero, div.loop.owl-carousel.full, div.carousel-root, div.carousel.carousel-slider'
    );
    if (explicitSlider) {
      const explicitContainer = normalizeSliderTarget(explicitSlider);
      if (explicitContainer && explicitContainer !== document.body) {
        return explicitContainer;
      }
    }

    const hasManyPosters = (el) =>
      el.querySelectorAll(
        'img[alt="poster"], img[src*="thumb"], img[src*="storage/media"], img[src*="/asura-images/covers/"], img[src*="/asura-images/banners/"]'
      ).length >= 3;
    const hasManySeriesLinks = (el) => {
      const count = this.getSeriesAnchors(el).length;
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
    const explicitBadges = Array.from(document.querySelectorAll(".toraka-badge"));
    const anchors = Array.from(document.querySelectorAll('a[href*="toraka.com"]'));
    const images = Array.from(
      document.querySelectorAll('img[src*="toraka"], img[alt*="Toraka"]')
    );
    const nodes = anchors.concat(images);
    const targets = new Set();

    explicitBadges.forEach((badge) => {
      targets.add(badge.closest("div") || badge);
    });

    nodes.forEach((node) => {
      const badge = node.closest?.(".toraka-badge");
      if (badge) {
        targets.add(badge.closest("div") || badge);
        return;
      }

      const candidate = this.findAncestor(node, (el) => {
        if (!el || !el.querySelectorAll) return false;
        const text = (el.textContent || "").toLowerCase();
        const hasTorakaText =
          text.includes("toraka") ||
          text.includes("powered by toraka") ||
          text.includes("track what you're reading");
        const linkCount = el.querySelectorAll('a[href*="toraka.com"]').length;
        const imgCount = el.querySelectorAll(
          'img[src*="toraka"], img[alt*="Toraka"]'
        ).length;
        if (el.closest("main") && linkCount === 1 && imgCount === 0) return false;
        return (
          (hasTorakaText && linkCount >= 1 && imgCount >= 1) ||
          (hasTorakaText && linkCount >= 2) ||
          imgCount >= 2
        );
      });
      if (candidate) targets.add(candidate);
    });

    return Array.from(targets);
  },

  findBetaBannerPromos() {
    const explicitBanners = Array.from(
      document.querySelectorAll(
        'astro-island[component-url*="MigrationBanner"],astro-island[component-url*="MonthlySubBanner"],astro-island[component-url*="ChargebackBanner"],astro-island[component-url*="RelinkBanner"],astro-island[component-url*="AnnouncementBanner"],astro-island[component-url*="PromoBanner"]'
      )
    );
    const anchors = Array.from(
      document.querySelectorAll('a[href*="beta.asurascans.com"], a[href*="/announcement/"]')
    );
    const targets = new Set();

    explicitBanners.forEach((node) => {
      targets.add(node);
    });

    anchors.forEach((anchor) => {
      const candidate = this.findAncestor(anchor, (el) => {
        if (!el || !el.querySelectorAll) return false;
        if (el === document.body || el === document.documentElement) return false;
        if (el.closest("header") || el.closest("footer") || el.closest("main")) return false;
        if (el.querySelector("header, main, footer")) return false;
        const bannerLinkCount = el.querySelectorAll(
          'a[href*="beta.asurascans.com"], a[href*="/announcement/"]'
        ).length;
        if (bannerLinkCount === 0) return false;
        const rect = el.getBoundingClientRect();
        if (!rect || rect.width < 220 || rect.height < 40) return false;
        if (rect.height > 220) return false;
        if (rect.top > window.innerHeight * 0.35) return false;
        const text = (el.textContent || "").toLowerCase();
        const hasBannerText =
          text.includes("beta") ||
          text.includes("announcement") ||
          text.includes("project:") ||
          text.includes("premium members only") ||
          text.includes("chargeback") ||
          text.includes("read");
        return hasBannerText;
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
    const linkCount = this.getSeriesAnchors(el).length;
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
    const linkCount = this.getSeriesAnchors(el).length;
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
      '#scroll-top-btn',
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

  cleanupBetaBanner() {
    document
      .querySelectorAll(".au-hide-beta-banner-target")
      .forEach((el) => {
        el.classList.remove("au-hide-beta-banner-target");
        el.style.removeProperty("display");
        el.style.removeProperty("pointer-events");
      });

    const adBlockEnabled = ConfigStore.get("adBlock");
    if (!adBlockEnabled) return;

    const targets = this.findBetaBannerPromos();
    targets.forEach((el) => {
      el.classList.add("au-hide-beta-banner-target");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("pointer-events", "none", "important");
    });
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
