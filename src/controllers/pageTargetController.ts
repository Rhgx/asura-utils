import { ConfigStore } from "../store/configStore.js";
import type { PageControllerContext } from "./types.js";

export const pageTargetController = {
  tagChapterTimestamps() {
    document
      .querySelectorAll(".au-chapter-timestamp")
      .forEach((element) => element.classList.remove("au-chapter-timestamp"));

    if (!ConfigStore.get("colorTimestamps")) return;

    const timestampPattern = /(?:\b(?:today|yesterday)\b|\b\d+\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hours?|days?|weeks?|months?|years?)\s+ago\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b)/i;

    this.getChapterAnchors(document).forEach((anchor) => {
      const row =
        anchor.closest("li, article, [class*='chapter' i]") ||
        anchor.parentElement?.parentElement ||
        anchor.parentElement;
      if (!row) return;

      row.querySelectorAll("time, [datetime], span, p").forEach((element) => {
        if (element.closest("a") === anchor) return;
        const text = (element.textContent || "").trim();
        if (text.length <= 60 && timestampPattern.test(text)) {
          element.classList.add("au-chapter-timestamp");
        }
      });
    });
  },

  applyOverhaulTargets() {
    this.clearOverhaulTargets();

    this.tagHeaderOverhaulTargets();
    this.tagThemeTargets();
    if (this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing) {
      this.tagSeriesOverhaulTargets();
    }
    this.tagChapterTimestamps();
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
          const isAccentToken = (token: string) =>
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
    const textOf = (el: Element) => (el.textContent || "").trim().toLowerCase();
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
      (chapterRows[0] ? this.findAncestor(chapterRows[0], (el) => this.getChapterAnchors(el).length >= 6) : null) ||
      (chapterAnchors[0] ? this.findAncestor(chapterAnchors[0], (el) => this.getChapterAnchors(el).length >= 6) : null);
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
} satisfies ThisType<PageControllerContext>;
