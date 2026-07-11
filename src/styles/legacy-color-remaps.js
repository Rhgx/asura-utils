const STYLE_ID = "au-legacy-color-remaps";
const NATIVE_THEME_KEY = "asuraClassic";

// Update this list when Asura changes hardcoded purple tokens.
const LEGACY_PURPLE_TOKENS = ["#913FE2", "#8E3FDD", "#6F2598", "#7928ca", "#9333ea"];
const PURPLE_HUE_MIN = 250;
const PURPLE_HUE_MAX = 330;
const NAMED_PURPLE_UTILITY_REGEX =
  /(?:^|:)(?:text|bg|border|ring|stroke|fill|from|via|to)-(?:purple|violet|fuchsia)(?:-[0-9]{2,3})?(?:\/[0-9]{1,3})?/i;

let dynamicRemapObserver = null;
let dynamicRemapTimer = 0;

function unique(values) {
  return Array.from(new Set(values));
}

function tokenVariants(token) {
  return unique([token, token.toLowerCase(), token.toUpperCase()]);
}

function buildClassToken(prefix, token) {
  return `${prefix}[${token}]`;
}

function buildRule(selectors, declarations) {
  if (!selectors.length) return "";
  return `${selectors.join(",")}{${declarations}}`;
}

function normalizeHexToken(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split("")
      .map((part) => part + part)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return "";
}

function hexToRgb(hex) {
  const normalized = normalizeHexToken(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) return { hue: 0, saturation: 0, lightness: lightness * 100 };
  let hue;
  if (max === rn) {
    hue = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    hue = (bn - rn) / delta + 2;
  } else {
    hue = (rn - gn) / delta + 4;
  }
  const degrees = Math.round(hue * 60);
  const normalizedHue = degrees < 0 ? degrees + 360 : degrees;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return {
    hue: normalizedHue,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function isPurpleHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return (
    hsl.hue >= PURPLE_HUE_MIN &&
    hsl.hue <= PURPLE_HUE_MAX &&
    hsl.saturation >= 38 &&
    hsl.lightness >= 24
  );
}

function extractHexes(input) {
  const matches = String(input || "").match(/#[0-9a-fA-F]{3,8}/g) || [];
  return unique(matches.map((hex) => normalizeHexToken(hex)).filter(Boolean));
}

function escapeClassToken(token) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(token);
  }
  return String(token).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function isNamedPurpleUtilityClass(token) {
  return NAMED_PURPLE_UTILITY_REGEX.test(String(token || ""));
}

function buildDynamicClassRule(themeScope, classToken) {
  const safeClass = `.${escapeClassToken(classToken)}`;
  const lower = classToken.toLowerCase();
  const hasOpacitySuffix =
    /\]\/\d+/.test(classToken) ||
    /(?:purple|violet|fuchsia)-\d{2,3}\/\d{1,3}/i.test(classToken);
  const hasHoverBg = /(?:^|:)hover:bg-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasBg = /(?:^|:)bg-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasHoverText = /(?:^|:)hover:text-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasText = /(?:^|:)text-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasHoverBorder = /(?:^|:)hover:border-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasBorder = /(?:^|:)border-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasStroke = /(?:^|:)stroke-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasFill = /(?:^|:)fill-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasRing = /(?:^|:)ring-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasHoverFrom = /(?:^|:)hover:from-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasFrom = /(?:^|:)from-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasHoverVia = /(?:^|:)hover:via-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasVia = /(?:^|:)via-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasHoverTo = /(?:^|:)hover:to-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);
  const hasTo = /(?:^|:)to-(?:\[#|(?:purple|violet|fuchsia)-)/i.test(classToken);

  if (hasHoverBg) {
    return buildRule(
      [`${themeScope} ${safeClass}:hover`],
      hasOpacitySuffix
        ? "background:var(--au-accent-glow)!important"
        : "background:var(--auo-accent-strong)!important;color:var(--auo-on-accent)!important"
    );
  }
  if (hasBg) {
    return buildRule(
      [`${themeScope} ${safeClass}`],
      hasOpacitySuffix
        ? "background:var(--au-accent-glow)!important"
        : "background:var(--auo-accent)!important;color:var(--auo-on-accent)!important"
    );
  }
  if (hasHoverText) {
    return buildRule([`${themeScope} ${safeClass}:hover`], "color:var(--auo-accent)!important");
  }
  if (hasText) {
    return buildRule([`${themeScope} ${safeClass}`], "color:var(--auo-accent)!important");
  }
  if (hasHoverBorder) {
    return buildRule([`${themeScope} ${safeClass}:hover`], "border-color:var(--auo-accent)!important");
  }
  if (hasBorder) {
    return buildRule([`${themeScope} ${safeClass}`], "border-color:var(--auo-accent)!important");
  }
  if (hasStroke) {
    return buildRule([`${themeScope} ${safeClass}`], "stroke:var(--auo-accent)!important");
  }
  if (hasFill) {
    return buildRule([`${themeScope} ${safeClass}`], "fill:var(--auo-accent)!important");
  }
  if (hasRing) {
    return buildRule(
      [`${themeScope} ${safeClass}`],
      "--tw-ring-color:var(--au-accent-glow)!important;border-color:var(--auo-accent)!important"
    );
  }
  if (hasHoverFrom) {
    return buildRule(
      [`${themeScope} ${safeClass}:hover`],
      "--tw-gradient-from:var(--auo-accent)!important;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,transparent)!important"
    );
  }
  if (hasFrom) {
    return buildRule(
      [`${themeScope} ${safeClass}`],
      "--tw-gradient-from:var(--auo-accent)!important;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,transparent)!important"
    );
  }
  if (hasHoverVia) {
    return buildRule(
      [`${themeScope} ${safeClass}:hover`],
      "--tw-gradient-stops:var(--tw-gradient-from),var(--auo-accent-strong),var(--tw-gradient-to,transparent)!important"
    );
  }
  if (hasVia) {
    return buildRule(
      [`${themeScope} ${safeClass}`],
      "--tw-gradient-stops:var(--tw-gradient-from),var(--auo-accent-strong),var(--tw-gradient-to,transparent)!important"
    );
  }
  if (hasHoverTo) {
    return buildRule([`${themeScope} ${safeClass}:hover`], "--tw-gradient-to:var(--auo-accent-strong)!important");
  }
  if (hasTo) {
    return buildRule([`${themeScope} ${safeClass}`], "--tw-gradient-to:var(--auo-accent-strong)!important");
  }
  return "";
}

function buildDynamicPurpleRemapCss() {
  const themeScope = "body.au-theme-enabled";
  const tokenSet = new Set();
  const svgFillTokenSet = new Set();
  const svgStrokeTokenSet = new Set();
  const candidates = document.querySelectorAll(
    "[class*='#'],[class*='purple'],[class*='violet'],[class*='fuchsia']"
  );

  candidates.forEach((node) => {
    if (!node || !node.classList) return;
    node.classList.forEach((classToken) => {
      if (!classToken) return;
      const hasHexClass = classToken.includes("[#");
      if (hasHexClass) {
        const hexes = extractHexes(classToken);
        if (hexes.length === 0) return;
        if (!hexes.some((hex) => isPurpleHex(hex))) return;
      } else if (!isNamedPurpleUtilityClass(classToken)) {
        return;
      }
      tokenSet.add(classToken);
    });
  });

  const svgNodes = document.querySelectorAll("svg[fill],svg[stroke],svg [fill],svg [stroke]");
  svgNodes.forEach((node) => {
    if (!node || !node.getAttribute) return;
    const fillValue = normalizeHexToken(node.getAttribute("fill"));
    if (fillValue && isPurpleHex(fillValue)) svgFillTokenSet.add(fillValue);
    const strokeValue = normalizeHexToken(node.getAttribute("stroke"));
    if (strokeValue && isPurpleHex(strokeValue)) svgStrokeTokenSet.add(strokeValue);
  });

  const classRules = Array.from(tokenSet)
    .map((classToken) => buildDynamicClassRule(themeScope, classToken))
    .filter(Boolean)
    .join("");

  const svgFillSelectors = Array.from(svgFillTokenSet).flatMap((token) =>
    tokenVariants(token).flatMap((variant) => [
      `${themeScope} svg[fill="${variant}"]`,
      `${themeScope} svg [fill="${variant}"]`,
    ])
  );
  const svgStrokeSelectors = Array.from(svgStrokeTokenSet).flatMap((token) =>
    tokenVariants(token).flatMap((variant) => [
      `${themeScope} svg[stroke="${variant}"]`,
      `${themeScope} svg [stroke="${variant}"]`,
    ])
  );
  const svgRules = [
    buildRule(svgFillSelectors, "fill:var(--auo-accent)!important"),
    buildRule(svgStrokeSelectors, "stroke:var(--auo-accent)!important"),
  ].join("");

  return `${classRules}${svgRules}`;
}

function buildLegacyColorRemapCss() {
  const tokens = unique(LEGACY_PURPLE_TOKENS.flatMap(tokenVariants));

  const rootTheme = "body.au-theme-enabled";
  const pageTheme =
    'body.au-theme-enabled:is(.au-page-series,.au-page-reader,.au-page-auth)';

  const lucideTextSelectors = tokens.map(
    (token) => `${rootTheme} [class*="lucide"][class*="${buildClassToken("text-", token)}"]`
  );
  const lucideStrokeSelectors = tokens.map(
    (token) => `${rootTheme} [class*="lucide"][class*="${buildClassToken("stroke-", token)}"]`
  );

  const bgSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("bg-", token)}"]`
  );
  const bgTintSelectors = tokens.flatMap((token) => [
    `${pageTheme} [class~="${buildClassToken("bg-", token)}/10"]`,
    `${pageTheme} [class~="${buildClassToken("hover:bg-", token)}/10"]:hover`,
    `${pageTheme} [class*="${buildClassToken("bg-", token)}/"]`,
    `${pageTheme} [class*="${buildClassToken("hover:bg-", token)}/"]:hover`,
  ]);
  const hoverBgStrongSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("hover:bg-", token)}"]:hover`
  );
  const bgInnerTextSelectors = tokens.flatMap((token) => [
    `${pageTheme} [class~="${buildClassToken("bg-", token)}"] [class~="text-white"]`,
    `${pageTheme} [class~="${buildClassToken("bg-", token)}"] [class~="text-[#f5f5f5]"]`,
  ]);

  const textSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("text-", token)}"]`
  );
  const hoverTextSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("hover:text-", token)}"]:hover`
  );
  const borderSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("border-", token)}"]`
  );
  const hoverBorderSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("hover:border-", token)}"]:hover`
  );
  const strokeSelectors = tokens.map(
    (token) => `${pageTheme} [class~="${buildClassToken("stroke-", token)}"]`
  );

  const textPurpleUtilitySelectors = [
    `${pageTheme} [class*="text-purple-"]`,
  ];
  const hoverTextPurpleUtilitySelectors = [
    `${pageTheme} [class*="hover:text-purple-"]:hover`,
  ];
  const borderPurpleUtilitySelectors = [
    `${pageTheme} [class*="border-purple-"]`,
  ];
  const hoverBorderPurpleUtilitySelectors = [
    `${pageTheme} [class*="hover:border-purple-"]:hover`,
  ];
  const ringPurpleUtilitySelectors = [
    `${pageTheme} [class*="ring-purple-"]`,
  ];

  const mentionSelectors = [
    `${pageTheme} [data-type="mention"]`,
    `${pageTheme} [data-lexical-mention]`,
  ];

  const svgFillSelectors = tokens.flatMap((token) => [
    `${pageTheme} svg[fill="${token}"]`,
    `${pageTheme} svg [fill="${token}"]`,
  ]);
  const svgStrokeSelectors = tokens.flatMap((token) => [
    `${pageTheme} svg[stroke="${token}"]`,
    `${pageTheme} svg [stroke="${token}"]`,
  ]);

  return [
    buildRule(
      lucideTextSelectors,
      "color:var(--auo-accent)!important;stroke:currentColor!important"
    ),
    buildRule(lucideStrokeSelectors, "stroke:var(--auo-accent)!important"),
    buildRule(
      bgSelectors,
      "background:var(--auo-accent)!important;color:var(--auo-on-accent)!important"
    ),
    buildRule(bgTintSelectors, "background:var(--au-accent-glow)!important"),
    buildRule(
      hoverBgStrongSelectors,
      "background:var(--auo-accent-strong)!important;color:var(--auo-on-accent)!important"
    ),
    buildRule(bgInnerTextSelectors, "color:var(--auo-on-accent)!important"),
    buildRule(textSelectors, "color:var(--auo-accent)!important"),
    buildRule(hoverTextSelectors, "color:var(--auo-accent)!important"),
    buildRule(borderSelectors, "border-color:var(--auo-accent)!important"),
    buildRule(hoverBorderSelectors, "border-color:var(--auo-accent)!important"),
    buildRule(strokeSelectors, "stroke:var(--auo-accent)!important"),
    buildRule(textPurpleUtilitySelectors, "color:var(--auo-accent)!important"),
    buildRule(hoverTextPurpleUtilitySelectors, "color:var(--auo-accent)!important"),
    buildRule(borderPurpleUtilitySelectors, "border-color:var(--auo-accent)!important"),
    buildRule(hoverBorderPurpleUtilitySelectors, "border-color:var(--auo-accent)!important"),
    buildRule(
      ringPurpleUtilitySelectors,
      "--tw-ring-color:var(--au-accent-glow)!important;border-color:var(--auo-accent)!important"
    ),
    buildRule(
      mentionSelectors,
      "color:var(--auo-accent)!important;background:color-mix(in srgb,var(--au-accent-glow) 44%,transparent)!important;border-radius:.35rem;padding:.05rem .3rem"
    ),
    buildRule(svgFillSelectors, "fill:var(--auo-accent)!important"),
    buildRule(svgStrokeSelectors, "stroke:var(--auo-accent)!important"),
  ].join("");
}

function injectStyle(cssText) {
  let style = document.getElementById(STYLE_ID);
  if (!cssText && !style) return;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = cssText;
}

function applyLegacyColorRemaps() {
  const activeTheme =
    document.documentElement?.getAttribute("data-au-theme") || NATIVE_THEME_KEY;
  if (activeTheme === NATIVE_THEME_KEY) {
    injectStyle("");
    return;
  }
  const cssText = `${buildLegacyColorRemapCss()}${buildDynamicPurpleRemapCss()}`;
  injectStyle(cssText);
}

function hasRelevantRemapMutation(mutations) {
  return mutations.some((mutation) => {
    if (
      mutation.type === "attributes" &&
      (mutation.attributeName === "class" || mutation.attributeName === "data-au-theme")
    ) {
      return true;
    }
    if (mutation.type !== "childList") return false;
    const nodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || []),
    ];
    return nodes.some((node) => {
      if (!node || node.nodeType !== 1) return false;
      const element = /** @type {Element} */ (node);
      if (element.id === STYLE_ID || element.closest?.(`#${STYLE_ID}`)) return false;
      if (element.hasAttribute?.("class")) return true;
      return !!element.querySelector?.("[class]");
    });
  });
}

export function installLegacyColorRemaps() {
  applyLegacyColorRemaps();
  if (dynamicRemapObserver || !document.documentElement) return;
  dynamicRemapObserver = new MutationObserver((mutations) => {
    if (!hasRelevantRemapMutation(mutations)) return;
    if (dynamicRemapTimer) window.clearTimeout(dynamicRemapTimer);
    dynamicRemapTimer = window.setTimeout(() => applyLegacyColorRemaps(), 180);
  });
  dynamicRemapObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-au-theme"],
  });
}
