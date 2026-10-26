import { THEME_PRESETS } from "../theme/themePresets.js";
import { SUPPORTED_LOCALES } from "../i18n/index.js";
import { KEYBIND_DEFAULTS, KEYBIND_FIELDS } from "./keybinds.js";

export type ChapterEndAction = "off" | "nextChapter" | "seriesPage" | "stopScroll";

const DEFAULTS = {
  hideSlider: false,
  colorTimestamps: true,
  readerWidget: true,
  hideNativeReaderControls: false,
  autoScrollSpeed: 2.0,
  imageWidth: 800,
  adBlock: true,
  hideToraka: true,
  hideComments: false,
  showProgressBar: true,
  fitWidthMode: false,
  hideDefaultBackToTop: true,
  doubleClickScroll: true,
  compactSidebar: false,
  hidePopularSection: false,
  hideAnnouncements: false,
  hideNovelPromos: false,
  hideReactions: false,
  menuSeriesOverhaul: false,
  readerDockCollapsed: true,
  readerDockSection: "all",
  chapterEndAction: "nextChapter" as ChapterEndAction,
  hasPremiumAccess: false,
  themePreset: "asuraClassic",
  trackReadingHistory: true,
  resumeChapterPosition: true,
  showNewChapterBadges: true,
  seriesFilters: true,
  customAccentEnabled: false,
  customAccent: "#913fe2",
  readerBrightness: 100,
  language: "auto",
  ...KEYBIND_DEFAULTS,
};

export type AppConfig = typeof DEFAULTS;
export type ConfigKey = keyof AppConfig;
export type BooleanConfigKey = {
  [K in ConfigKey]: AppConfig[K] extends boolean ? K : never;
}[ConfigKey];
const CONFIG_KEYS = new Set<string>(Object.keys(DEFAULTS));

function isConfigKey(value: string | null): value is ConfigKey {
  return value !== null && CONFIG_KEYS.has(value);
}

export interface ConfigMeta {
  type?: "boolean" | "number" | "string";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

const CONSTANTS = {
  BASE_WIDTH: 800,
  SPEED_STEP: 0.5,
};

const CONFIG_META: Partial<Record<ConfigKey, ConfigMeta>> = {
  autoScrollSpeed: { type: "number", min: 0.1, max: 15.0, step: 0.1 },
  imageWidth: { type: "number", min: 400, max: 3000, step: 1 },
  menuSeriesOverhaul: { type: "boolean" },
  readerDockCollapsed: { type: "boolean" },
  readerDockSection: { type: "string" },
  chapterEndAction: {
    type: "string",
    options: ["off", "nextChapter", "seriesPage", "stopScroll"],
  },
  hasPremiumAccess: { type: "boolean" },
  trackReadingHistory: { type: "boolean" },
  resumeChapterPosition: { type: "boolean" },
  customAccentEnabled: { type: "boolean" },
  customAccent: { type: "string" },
  readerBrightness: { type: "number", min: 40, max: 100, step: 5 },
  language: { type: "string", options: ["auto", ...SUPPORTED_LOCALES] },
  ...Object.fromEntries(KEYBIND_FIELDS.map((field) => [field.key, { type: "string" }])),
  themePreset: { type: "string", options: Object.keys(THEME_PRESETS) },
};

export { DEFAULTS, CONSTANTS, CONFIG_META, isConfigKey };
