import { THEME_PRESET_OPTIONS } from "../theme/themePresets.js";
import type { AppConfig, ConfigKey } from "./defaults.js";

export interface ModalOption { value: string; label: string }
export interface ModalInput {
  key: ConfigKey;
  id: string;
  label: string;
  type: "number" | "color";
  step?: string;
  tooltip?: string;
}
export interface ModalSelect {
  key: ConfigKey;
  id: string;
  label: string;
  options: readonly (string | ModalOption)[];
  tooltip?: string;
}
export interface ModalSection {
  key: string;
  title: string;
  toggles?: readonly (readonly [ConfigKey, string])[];
  selects?: readonly ModalSelect[];
  inputs?: readonly ModalInput[];
  render?: () => string;
  html?: string;
}

const APPEARANCE_MODAL_SECTION = {
  title: "Appearance",
  toggles: [["customAccentEnabled", "Custom Accent Color"]],
  selects: [
    {
      key: "themePreset",
      id: "sel-themePreset",
      label: "Theme",
      options: THEME_PRESET_OPTIONS,
    },
  ],
  inputs: [
    {
      key: "customAccent",
      id: "inp-customAccent",
      label: "Accent Color",
      type: "color",
    },
  ],
} satisfies Omit<ModalSection, "key">;

const READER_MODAL_SECTION = {
  title: "Reader",
  toggles: [
    ["readerWidget", "Enable Reader Dock"],
    ["hideNativeReaderControls", "Hide Site Reader Controls"],
    ["showProgressBar", "Show Progress Bar"],
    ["fitWidthMode", "Fit Width to Screen"],
    ["doubleClickScroll", "Double-Click to Scroll"],
    ["trackReadingHistory", "Track Reading History"],
    ["resumeChapterPosition", "Resume Chapter Position"],
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
    {
      key: "readerBrightness",
      id: "inp-readerBrightness",
      label: "Image Brightness (%)",
      type: "number",
      step: "5",
    },
  ],
} satisfies Omit<ModalSection, "key">;

export { APPEARANCE_MODAL_SECTION, READER_MODAL_SECTION };
