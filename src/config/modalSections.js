import { THEME_PRESET_OPTIONS } from "../theme/themePresets.js";

const APPEARANCE_MODAL_SECTION = {
  title: "Appearance",
  selects: [
    {
      key: "themePreset",
      id: "sel-themePreset",
      label: "Theme",
      options: THEME_PRESET_OPTIONS,
    },
  ],
};

const READER_MODAL_SECTION = {
  title: "Reader",
  toggles: [
    ["readerWidget", "Enable Reader Dock"],
    ["showProgressBar", "Show Progress Bar"],
    ["fitWidthMode", "Fit Width to Screen"],
    ["doubleClickScroll", "Double-Click to Scroll"],
    ["hasPremiumAccess", "Account Has Premium"],
  ],
  selects: [
    {
      key: "chapterEndAction",
      id: "sel-chapterEndAction",
      label: "Chapter End Action",
      options: [
        { value: "off", label: "Disabled" },
        { value: "nextChapter", label: "Next Chapter (Smart)" },
        { value: "seriesPage", label: "Series Page (Smart)" },
        { value: "stopScroll", label: "Stop Auto Scroll" },
      ],
    },
  ],
  inputs: [
    {
      key: "imageWidth",
      id: "inp-imageWidth",
      label: "Image Width (px)",
      type: "number",
      step: "1",
    },
    {
      key: "autoScrollSpeed",
      id: "inp-autoScrollSpeed",
      label: "Scroll Speed",
      type: "number",
      step: "0.1",
    },
  ],
};

export { APPEARANCE_MODAL_SECTION, READER_MODAL_SECTION };
