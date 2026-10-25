import { ConfigStore } from "../store/configStore.js";
import type { PageControllerContext } from "./types.js";

export const pageCleanupController = {
  findHomeSlider(): Element | null {
    const normalizeSliderTarget = (node: Element | null): Element | null => {
      if (!node) return null;
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

      // Avoid broad wrappers that can span most of the page.
      const nestedOverflow = node.querySelector("div.overflow-hidden");
      if (nestedOverflow && node.classList && node.classList.contains("min-h-72")) {
        return nestedOverflow;
      }

      return node;
    };

    // Prefer explicit home-slider structures from the current Asura homepage markup.
    const explicitSlider = document.querySelector(
      'astro-island[component-url*="HeroCarousel"], .hero-section-embla, .embla-hero'
    );
    if (explicitSlider) {
      const explicitContainer = normalizeSliderTarget(explicitSlider);
      if (explicitContainer && explicitContainer !== document.body) {
        return explicitContainer;
      }
    }

    const hasManyPosters = (el: Element) =>
      el.querySelectorAll(
        'img[alt="poster"], img[src*="thumb"], img[src*="storage/media"], img[src*="/asura-images/covers/"], img[src*="/asura-images/banners/"]'
      ).length >= 3;
    const hasManySeriesLinks = (el: Element) => {
      const count = this.getSeriesAnchors(el).length;
      return count >= 4 && count <= 24;
    };
    const isReasonableSliderContainer = (el: Element) => {
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

    // Search common carousel wrappers first to avoid matching an unrelated poster grid.
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

    const best = pool.reduce<Element | null>((acc, el) => {
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
    const targets = new Set<Element>();

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
    // Account and payment notices (payment method, dispute, failed payment, relink) need
    // the user's attention, so they are never hidden, even when a text or link check matches.
    const accountNoticeComponents = ["MigrationBanner", "ChargebackBanner", "RelinkBanner", "PaymentFailedBanner"];
    const accountNotices = Array.from(
      document.querySelectorAll(
        accountNoticeComponents.map((name) => `astro-island[component-url*="${name}"]`).join(",")
      )
    );
    // Component names are the safest match; link and text checks cover older layouts.
    const explicitBanners = Array.from(
      document.querySelectorAll(
        'astro-island[component-url*="MonthlySubBanner"],astro-island[component-url*="AnnouncementBanner"],astro-island[component-url*="PromoBanner"]'
      )
    );
    const anchors = Array.from(
      document.querySelectorAll('a[href*="beta.asurascans.com"], a[href*="/announcement/"]')
    );
    const targets = new Set<Element>();

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

    // Drop any target that is, sits inside, or wraps a protected notice island.
    const isAccountNotice = (el: Element) =>
      accountNotices.some((notice) => notice.contains(el) || el.contains(notice));
    return Array.from(targets).filter((el) => !isAccountNotice(el));
  },

  findPopularSections() {
    const targets = new Set<Element>();

    // The site's Trending and Popular blocks are explicit components, so hide them directly.
    document
      .querySelectorAll('astro-island[component-url*="TrendingSection"]')
      .forEach((el) => targets.add(el));
    const popularIsland = document.querySelector('astro-island[component-url*="PopularSidebar"]');
    if (popularIsland) {
      // The Popular column holds only that island, so hide the whole column to avoid an empty gap.
      const popularColumn = popularIsland.parentElement;
      targets.add(popularColumn && popularColumn.children.length === 1 ? popularColumn : popularIsland);
    }
    if (targets.size > 0) return Array.from(targets);

    // Fallback for layouts without those islands. Never return a container that holds the main
    // listing, or a tall one, since walking up from a heading can reach the whole content row.
    const isSafePopularTarget = (el: Element) =>
      !el.matches("main") &&
      !el.querySelector('main, main h1, astro-island[component-url*="LatestUpdates"]') &&
      el.getBoundingClientRect().height <= 1600;
    const isFallbackSection = (el: Element) =>
      this.isLikelySeriesSection(el, { minLinks: 3 }) && isSafePopularTarget(el);

    const titlePattern =
      /\b(popular|trending|hot|most\s+(read|popular)|top\s+series)\b/i;
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, strong, span, p")
    );

    const maybeAddSectionForNode = (node: Element) => {
      const txt = (node.textContent || "").trim().toLowerCase();
      if (!txt || txt.length > 120 || !titlePattern.test(txt)) return;
      const container = this.findAncestor(node, isFallbackSection);
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
      const container = this.findAncestor(el, isFallbackSection);
      if (container) targets.add(container);
    });

    return this.normalizeSectionTargets(Array.from(targets));
  },

  normalizeSectionTargets(nodes: Iterable<Element>): Element[] {
    const list = Array.from(nodes);
    return list.filter(
      (el) => !list.some((other) => other !== el && other.contains(el))
    );
  },

  isLikelySeriesSection(el: Element, options: { minLinks?: number; maxLinks?: number } = {}): boolean {
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

  isLikelySidebarColumn(el: Element): boolean {
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
    const targets = new Set<Element>();

    // On the home page the Popular list has its own right column, so use that before generic detection.
    const popularIsland = document.querySelector('astro-island[component-url*="PopularSidebar"]');
    const popularColumn = popularIsland?.parentElement;
    if (popularColumn && popularColumn.children.length === 1) {
      return [popularColumn];
    }

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
    document
      .querySelectorAll(".au-compact-sidebar-expand")
      .forEach((el) => el.classList.remove("au-compact-sidebar-expand"));

    if (!ConfigStore.get("compactSidebar")) return;
    // The site's columns only sit side by side from the lg breakpoint (1024px); below that they stack.
    if (window.innerWidth < 1024) return;

    const targets = this.findCompactSidebarTargets();
    targets.forEach((el) => {
      el.classList.add("au-compact-sidebar-target");
    });

    // Let the Latest Updates column take the width the compacted sidebar frees up.
    const mainColumn = document.querySelector('astro-island[component-url*="LatestUpdates"]')?.parentElement;
    const row = mainColumn?.parentElement;
    if (mainColumn && row && targets.some((el) => el.parentElement === row)) {
      mainColumn.classList.add("au-compact-sidebar-expand");
    }
  },

  isLikelyBackToTopControl(el: Element, allowNonFloating = false): boolean {
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
      aria.includes("return to top") ||
      title.includes("back to top") ||
      title.includes("scroll to top") ||
      title.includes("return to top") ||
      text.includes("back to top") ||
      text.includes("return to top");

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
      '[aria-label*="return to top" i]',
      '[title*="back to top" i]',
      '[title*="scroll to top" i]',
      '[title*="return to top" i]',
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
        (el as HTMLElement).style.removeProperty("display");
        (el as HTMLElement).style.removeProperty("pointer-events");
      });

    const adBlockEnabled = ConfigStore.get("adBlock");
    if (!adBlockEnabled) return;

    const targets = this.findBetaBannerPromos();
    targets.forEach((el) => {
      el.classList.add("au-hide-beta-banner-target");
      (el as HTMLElement).style.setProperty("display", "none", "important");
      (el as HTMLElement).style.setProperty("pointer-events", "none", "important");
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
    // The site rewrites the home URL to /comics or /novels depending on the reading mode.
    const isHome =
      path === "/" || path === "" || path.startsWith("/page/") || /^\/(comics|novels)\/?$/.test(path);
    document
      .querySelectorAll(".au-hide-popular-target")
      .forEach((el) => el.classList.remove("au-hide-popular-target"));
    document
      .querySelectorAll(".au-hide-popular-expand")
      .forEach((el) => el.classList.remove("au-hide-popular-expand"));

    if (ConfigStore.get("hidePopularSection")) {
      const popularSections = this.findPopularSections();
      popularSections.forEach((el) => el.classList.add("au-hide-popular-target"));

      // When the Popular column is hidden, let the Latest Updates column take the full row.
      const mainColumn = document.querySelector('astro-island[component-url*="LatestUpdates"]')?.parentElement;
      const row = mainColumn?.parentElement;
      if (mainColumn && row && popularSections.some((el) => el.parentElement === row)) {
        mainColumn.classList.add("au-hide-popular-expand");
      }
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
} satisfies ThisType<PageControllerContext>;
