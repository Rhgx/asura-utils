const STYLE_ID = "au-dynamic-color-remaps";
const NATIVE_THEME_KEY = "asuraClassic";
const THEME_SCOPE = "body.au-theme-enabled";

// Known hardcoded purple tokens on the current Asura site. These seed static
// rules so accents are themed on first paint, before the DOM scan runs.
// The dynamic scan below picks up anything this list misses.
const KNOWN_PURPLE_HEXES = [
  "#913FE2",
  "#8E3FDD",
  "#6F2598",
  "#5A1F78",
  "#7C35C2",
  "#7B35C1",
  "#7C3AED",
  "#7B2FD1",
  "#7928CA",
  "#9333EA",
  "#A78BFA",
  "#C084FC",
];
const SEED_UTILITY_TEMPLATES = [
  "text-[{hex}]",
  "hover:text-[{hex}]",
  "group-hover:text-[{hex}]",
  "bg-[{hex}]",
  "hover:bg-[{hex}]",
  "group-hover:bg-[{hex}]",
  "border-[{hex}]",
  "hover:border-[{hex}]",
  "from-[{hex}]",
  "to-[{hex}]",
];

const PURPLE_HUE_MIN = 250;
const PURPLE_HUE_MAX = 330;
const NAMED_PURPLE_SCALE_REGEX = /^(?:purple|violet|fuchsia)-(\d{2,3})(?:\/(\d{1,3}))?$/i;
const UTILITY_REGEX = /^(bg|text|border|ring|stroke|fill|from|via|to|shadow)-(.+)$/;

// Tailwind variants we can translate to CSS selectors. Unknown variants
// (responsive prefixes, data-[...] states) are skipped entirely so we never
// turn a conditional style into an always-on one.
const VARIANT_SELECTOR_SUFFIX: Readonly<Record<string, string>> = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
};

let dynamicRemapObserver: MutationObserver | null = null;
let dynamicRemapTimer = 0;

interface Rgb { r: number; g: number; b: number }
interface Hsl { hue: number; saturation: number; lightness: number }
interface ParsedUtility { lightness: number; opacity: number | null }
type UtilityPrefix = "bg" | "text" | "border" | "ring" | "stroke" | "fill" | "from" | "via" | "to" | "shadow";

function unique<T>(values: Iterable<T>): T[] {
  return Array.from(new Set(values));
}

function caseVariants(token: string): string[] {
  return unique([token, token.toLowerCase(), token.toUpperCase()]);
}

function buildRule(selectors: readonly string[], declarations: string): string {
  if (!selectors.length) return "";
  return `${selectors.join(",")}{${declarations}}`;
}

function normalizeHexToken(hex: unknown): string {
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

function hexToRgb(hex: unknown): Rgb | null {
  const normalized = normalizeHexToken(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
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

function hexLightness(hex: unknown): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 50;
  return rgbToHsl(rgb.r, rgb.g, rgb.b).lightness;
}

function isPurpleHex(hex: unknown): boolean {
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

function extractHexes(input: unknown): string[] {
  const matches = String(input || "").match(/#[0-9a-fA-F]{3,8}/g) || [];
  return unique(matches.map((hex) => normalizeHexToken(hex)).filter(Boolean));
}

function escapeClassToken(token: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(token);
  }
  return String(token).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

// Parses the utility value ("[#913FE2]/15", "purple-600") into the source
// color and optional opacity percentage. Returns null for non-purple values.
function parseUtilityValue(value: string): ParsedUtility | null {
  const hexMatch = value.match(/^\[(#[0-9a-fA-F]{3,8})\](?:\/(\d{1,3}))?$/);
  if (hexMatch) {
    const hex = normalizeHexToken(hexMatch[1]!);
    if (!hex || !isPurpleHex(hex)) return null;
    return {
      lightness: hexLightness(hex),
      opacity: hexMatch[2] ? Math.min(100, Number(hexMatch[2])) : null,
    };
  }

  const namedMatch = value.match(NAMED_PURPLE_SCALE_REGEX);
  if (namedMatch) {
    const scale = Number(namedMatch[1]);
    // Rough Tailwind scale-to-lightness mapping: 400 and below are pale,
    // 700 and above are deep.
    const lightness = scale <= 400 ? 70 : scale >= 700 ? 32 : 50;
    return {
      lightness,
      opacity: namedMatch[2] ? Math.min(100, Number(namedMatch[2])) : null,
    };
  }

  return null;
}

function accentMix(opacityPercent: number): string {
  return `color-mix(in srgb,var(--auo-accent) ${opacityPercent}%,transparent)`;
}

function declarationsFor(prefix: UtilityPrefix, parsed: ParsedUtility, { isHover }: { isHover: boolean }): string {
  const { lightness, opacity } = parsed;
  const isSoft = lightness > 64;
  const isStrong = lightness < 38;
  const textColor = isSoft ? "var(--auo-link)" : "var(--auo-accent)";

  switch (prefix) {
    case "text":
      return `color:${textColor}!important`;
    case "stroke":
      return `stroke:${textColor}!important`;
    case "fill":
      return `fill:${textColor}!important`;
    case "bg": {
      if (opacity !== null) return `background-color:${accentMix(opacity)}!important`;
      const bg =
        isStrong || isHover ? "var(--auo-accent-strong)" : "var(--auo-accent)";
      return `background-color:${bg}!important;color:var(--auo-on-accent)!important`;
    }
    case "border": {
      const color = opacity !== null ? accentMix(opacity) : "var(--auo-accent)";
      return `border-color:${color}!important`;
    }
    case "ring": {
      const color = opacity !== null ? accentMix(opacity) : "var(--auo-accent)";
      return `--tw-ring-color:${color}!important`;
    }
    case "shadow": {
      const color =
        opacity !== null ? accentMix(opacity) : accentMix(35);
      return `--tw-shadow-color:${color}!important;--tw-shadow:var(--tw-shadow-colored)!important`;
    }
    case "from":
      return "--tw-gradient-from:var(--auo-accent)!important";
    case "via":
      return "--tw-gradient-stops:var(--tw-gradient-from),var(--auo-accent-strong),var(--tw-gradient-to,transparent)!important";
    case "to":
      return "--tw-gradient-to:var(--auo-accent-strong)!important";
    default:
      return "";
  }
}

function buildRuleForClassToken(classToken: string): string {
  const segments = String(classToken).split(":");
  const utility = segments.pop();
  const variants = segments;

  if (!utility) return "";
  const utilityMatch = utility.match(UTILITY_REGEX);
  if (!utilityMatch) return "";
  const prefix = utilityMatch[1] as UtilityPrefix | undefined;
  const value = utilityMatch[2];
  if (!prefix || !value) return "";

  const parsed = parseUtilityValue(value);
  if (!parsed) return "";

  let selector = `.${escapeClassToken(classToken)}`;
  let hasGroupHover = false;
  let hasHover = false;
  for (const variant of variants) {
    if (variant === "group-hover") {
      hasGroupHover = true;
      hasHover = true;
      continue;
    }
    const suffix = VARIANT_SELECTOR_SUFFIX[variant];
    if (!suffix) return "";
    if (variant === "hover") hasHover = true;
    selector += suffix;
  }
  if (hasGroupHover) selector = `.group:hover ${selector}`;

  const declarations = declarationsFor(prefix, parsed, {
    // group-hover solid backgrounds start transparent, so map them to the
    // base accent; plain hover backgrounds sit on accent buttons and need
    // the strong shade to stay distinguishable.
    isHover: hasHover && !hasGroupHover,
  });
  if (!declarations) return "";
  return buildRule([`${THEME_SCOPE} ${selector}`], declarations);
}

function isPurpleUtilityCandidate(classToken: string): boolean {
  if (classToken.includes("[#")) {
    const hexes = extractHexes(classToken);
    return hexes.length > 0 && hexes.some((hex) => isPurpleHex(hex));
  }
  return /(?:^|:)(?:bg|text|border|ring|stroke|fill|from|via|to|shadow)-(?:purple|violet|fuchsia)-/i.test(
    classToken
  );
}

function collectSeedTokens(): Set<string> {
  const tokens = new Set<string>();
  KNOWN_PURPLE_HEXES.forEach((hex) => {
    caseVariants(hex).forEach((variant) => {
      SEED_UTILITY_TEMPLATES.forEach((template) => {
        tokens.add(template.replace("{hex}", variant));
      });
    });
  });
  return tokens;
}

function collectDomTokens(tokenSet: Set<string>): void {
  const candidates = document.querySelectorAll(
    "[class*='#'],[class*='purple'],[class*='violet'],[class*='fuchsia']"
  );
  candidates.forEach((node) => {
    if (!node || !node.classList) return;
    node.classList.forEach((classToken) => {
      if (!classToken || tokenSet.has(classToken)) return;
      if (isPurpleUtilityCandidate(classToken)) tokenSet.add(classToken);
    });
  });
}

function buildSvgAttributeRemapCss(): string {
  const fillTokens = new Set<string>();
  const strokeTokens = new Set<string>();
  const svgNodes = document.querySelectorAll(
    "svg[fill],svg[stroke],svg [fill],svg [stroke]"
  );
  svgNodes.forEach((node) => {
    if (!node || !node.getAttribute) return;
    const fillValue = normalizeHexToken(node.getAttribute("fill"));
    if (fillValue && isPurpleHex(fillValue)) fillTokens.add(fillValue);
    const strokeValue = normalizeHexToken(node.getAttribute("stroke"));
    if (strokeValue && isPurpleHex(strokeValue)) strokeTokens.add(strokeValue);
  });

  const fillSelectors = Array.from(fillTokens).flatMap((token) =>
    caseVariants(token).flatMap((variant) => [
      `${THEME_SCOPE} svg[fill="${variant}"]`,
      `${THEME_SCOPE} svg [fill="${variant}"]`,
    ])
  );
  const strokeSelectors = Array.from(strokeTokens).flatMap((token) =>
    caseVariants(token).flatMap((variant) => [
      `${THEME_SCOPE} svg[stroke="${variant}"]`,
      `${THEME_SCOPE} svg [stroke="${variant}"]`,
    ])
  );
  return [
    buildRule(fillSelectors, "fill:var(--auo-accent)!important"),
    buildRule(strokeSelectors, "stroke:var(--auo-accent)!important"),
  ].join("");
}

function buildDynamicRemapCss(): string {
  const tokenSet = collectSeedTokens();
  collectDomTokens(tokenSet);

  const classRules = Array.from(tokenSet)
    .map((classToken) => buildRuleForClassToken(classToken))
    .filter(Boolean)
    .join("");

  const mentionRule = buildRule(
    [`${THEME_SCOPE} [data-type="mention"]`, `${THEME_SCOPE} [data-lexical-mention]`],
    `color:var(--auo-accent)!important;background:${accentMix(16)}!important;border-radius:.35rem;padding:.05rem .3rem`
  );

  return `${classRules}${buildSvgAttributeRemapCss()}${mentionRule}`;
}

function injectStyle(cssText: string): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!cssText && !style) return;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== cssText) style.textContent = cssText;
}

function applyDynamicColorRemaps(): void {
  const root = document.documentElement;
  const activeTheme = root?.getAttribute("data-au-theme") || NATIVE_THEME_KEY;
  const hasCustomAccent = root?.hasAttribute("data-au-custom-accent");
  if (activeTheme === NATIVE_THEME_KEY && !hasCustomAccent) {
    injectStyle("");
    return;
  }
  injectStyle(buildDynamicRemapCss());
}

function hasRelevantRemapMutation(mutations: readonly MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    if (
      mutation.type === "attributes" &&
      (mutation.attributeName === "class" ||
        mutation.attributeName === "data-au-theme" ||
        mutation.attributeName === "data-au-custom-accent")
    ) {
      return !(mutation.target instanceof Element) || mutation.target.id !== STYLE_ID;
    }
    if (mutation.type !== "childList") return false;
    const nodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || []),
    ];
    return nodes.some((node) => {
      if (!node || node.nodeType !== 1) return false;
      const element = node as Element;
      if (element.id === STYLE_ID || element.closest(`#${STYLE_ID}`)) return false;
      if (element.hasAttribute("class")) return true;
      return !!element.querySelector("[class]");
    });
  });
}

export function installDynamicColorRemaps(): void {
  applyDynamicColorRemaps();
  if (dynamicRemapObserver || !document.documentElement) return;
  dynamicRemapObserver = new MutationObserver((mutations) => {
    if (!hasRelevantRemapMutation(mutations)) return;
    if (dynamicRemapTimer) window.clearTimeout(dynamicRemapTimer);
    dynamicRemapTimer = window.setTimeout(() => applyDynamicColorRemaps(), 180);
  });
  dynamicRemapObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-au-theme", "data-au-custom-accent"],
  });
}
