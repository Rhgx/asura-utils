import { THEME_PRESET_OPTIONS } from "../theme/themePresets.js";
import { SUPPORTED_LOCALES, t } from "../i18n/index.js";
import type { Locale } from "../i18n/index.js";
import type { ConfigKey } from "./defaults.js";

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
  // Puts selects above toggles, for the Language control at the top of General.
  selectsFirst?: boolean;
  inputs?: readonly ModalInput[];
  render?: () => string;
  html?: string;
}

// Native names stay in their own language so each one is recognizable from any UI language.
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  id: "Bahasa Indonesia",
};

// These are functions because their labels are translated when the modal renders.
function languageModalSelect(): ModalSelect {
  return {
    key: "language",
    id: "sel-language",
    label: t("setting.language.label"),
    options: [
      { value: "auto", label: t("option.language.auto") },
      ...SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_NAMES[locale] })),
    ],
  };
}

function appearanceModalSection(): Omit<ModalSection, "key"> {
  return {
    title: t("tab.appearance"),
    toggles: [["customAccentEnabled", t("setting.customAccentEnabled.label")]],
    selects: [
      {
        key: "themePreset",
        id: "sel-themePreset",
        label: t("setting.themePreset.label"),
        options: THEME_PRESET_OPTIONS,
      },
    ],
    inputs: [
      {
        key: "customAccent",
        id: "inp-customAccent",
        label: t("setting.customAccent.label"),
        type: "color",
      },
    ],
  };
}

function readerModalSection(): Omit<ModalSection, "key"> {
  return {
    title: t("tab.reader"),
    toggles: [
      ["readerWidget", t("setting.readerWidget.label")],
      ["hideNativeReaderControls", t("setting.hideNativeReaderControls.label")],
      ["showProgressBar", t("setting.showProgressBar.label")],
      ["fitWidthMode", t("setting.fitWidthMode.label")],
      ["doubleClickScroll", t("setting.doubleClickScroll.label")],
      ["trackReadingHistory", t("setting.trackReadingHistory.label")],
      ["resumeChapterPosition", t("setting.resumeChapterPosition.label")],
      ["hasPremiumAccess", t("setting.hasPremiumAccess.label")],
    ],
    selects: [
      {
        key: "chapterEndAction",
        id: "sel-chapterEndAction",
        label: t("setting.chapterEndAction.label"),
        options: [
          { value: "off", label: t("option.chapterEnd.off") },
          { value: "nextChapter", label: t("option.chapterEnd.nextChapter") },
          { value: "seriesPage", label: t("option.chapterEnd.seriesPage") },
          { value: "stopScroll", label: t("option.chapterEnd.stopScroll") },
        ],
      },
    ],
    inputs: [
      {
        key: "imageWidth",
        id: "inp-imageWidth",
        label: t("setting.imageWidth.label"),
        type: "number",
        step: "1",
      },
      {
        key: "autoScrollSpeed",
        id: "inp-autoScrollSpeed",
        label: t("setting.autoScrollSpeed.label"),
        type: "number",
        step: "0.1",
      },
      {
        key: "readerBrightness",
        id: "inp-readerBrightness",
        label: t("setting.readerBrightness.label"),
        type: "number",
        step: "5",
      },
    ],
  };
}

export { appearanceModalSection, languageModalSelect, readerModalSection };
