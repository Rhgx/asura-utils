import { THEME_PRESETS } from "../theme/themePresets.js";
import { KEYBIND_DEFAULTS, KEYBIND_FIELDS } from "./keybinds.js";

const DEFAULTS = {
  hideSlider: false,
  colorTimestamps: true,
  readerWidget: true,
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
  menuSeriesOverhaul: false,
  readerDockCollapsed: true,
  readerDockSection: "all",
  chapterEndAction: "nextChapter",
  hasPremiumAccess: false,
  themePreset: "asuraClassic",
  trackReadingHistory: true,
  resumeChapterPosition: true,
  customAccentEnabled: false,
  customAccent: "#913fe2",
  readerBrightness: 100,
  ...KEYBIND_DEFAULTS,
};

const CONSTANTS = {
  BASE_WIDTH: 800,
  SPEED_STEP: 0.5,
};

const CONFIG_META = {
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
  ...Object.fromEntries(KEYBIND_FIELDS.map((field) => [field.key, { type: "string" }])),
  themePreset: { type: "string", options: Object.keys(THEME_PRESETS) },
};

export { DEFAULTS, CONSTANTS, CONFIG_META };
