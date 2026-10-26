import { THEME_PRESET_OPTIONS } from "../theme/themePresets.js";
import { SUPPORTED_LOCALES, t } from "../i18n/index.js";
import type { Locale, MessageKey } from "../i18n/index.js";
import type { BooleanConfigKey, ConfigKey } from "./defaults.js";

// Config keys with both a "setting.<key>.label" and a "setting.<key>.tooltip" catalog entry.
// Only these can appear as rows, so every row is guaranteed a label and a description.
export type DescribedSettingKey = {
  [K in ConfigKey]: `setting.${K}.label` extends MessageKey
    ? `setting.${K}.tooltip` extends MessageKey
      ? K
      : never
    : never;
}[ConfigKey];

type DescribedToggleKey = DescribedSettingKey & BooleanConfigKey;

export interface SettingOption { value: string; label: string }
export interface PaletteOption extends SettingOption { swatches: readonly string[] }

interface RowDependencies {
  // The row is disabled while this setting is off.
  requires?: BooleanConfigKey;
  // The row is disabled while this setting is on.
  disabledWhen?: BooleanConfigKey;
}

export type SettingRow = RowDependencies & (
  | { kind: "toggle"; key: DescribedToggleKey }
  | { kind: "number"; key: DescribedSettingKey; step: string }
  | { kind: "color"; key: DescribedSettingKey }
  // Options are a function because their labels are translated when the modal renders.
  | { kind: "select"; key: DescribedSettingKey; options: () => readonly SettingOption[] }
  // A dropdown whose options show color swatches, which a native select cannot draw.
  | { kind: "palette"; key: DescribedSettingKey; options: () => readonly PaletteOption[] }
);

export interface ChecklistItem extends RowDependencies {
  key: DescribedToggleKey;
}

// Panels that are not plain settings and are rendered by the settings view itself.
export type GroupContent = "history" | "filters" | "shortcuts" | "settingsData";

export interface SettingsGroup {
  title?: MessageKey;
  rows?: readonly SettingRow[];
  // Compact two-column checkboxes for long runs of simple on/off switches.
  checklist?: readonly ChecklistItem[];
  content?: GroupContent;
}

export type SettingsPageKey = "reader" | "site" | "library" | "appearance" | "shortcuts" | "backup";

export interface SettingsPage {
  key: SettingsPageKey;
  title: MessageKey;
  groups: readonly SettingsGroup[];
  // Pinned to the bottom of the sidebar, apart from the everyday sections.
  footer?: boolean;
}

// Native names stay in their own language so each one is recognizable from any UI language.
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  id: "Bahasa Indonesia",
};

function languageOptions(): SettingOption[] {
  return [
    { value: "auto", label: t("option.language.auto") },
    ...SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_NAMES[locale] })),
  ];
}

function chapterEndOptions(): SettingOption[] {
  return [
    { value: "off", label: t("option.chapterEnd.off") },
    { value: "nextChapter", label: t("option.chapterEnd.nextChapter") },
    { value: "seriesPage", label: t("option.chapterEnd.seriesPage") },
    { value: "stopScroll", label: t("option.chapterEnd.stopScroll") },
  ];
}

// Pages in sidebar order.
const SETTINGS_PAGES: readonly SettingsPage[] = [
  {
    key: "reader",
    title: "tab.reader",
    groups: [
      {
        title: "group.images",
        rows: [
          { kind: "toggle", key: "fitWidthMode" },
          { kind: "number", key: "imageWidth", step: "1", disabledWhen: "fitWidthMode" },
          { kind: "number", key: "readerBrightness", step: "5" },
        ],
      },
      {
        title: "group.readerTools",
        rows: [
          { kind: "toggle", key: "readerWidget" },
          { kind: "toggle", key: "hideNativeReaderControls" },
          { kind: "toggle", key: "showProgressBar" },
        ],
      },
      {
        title: "group.autoScroll",
        rows: [
          { kind: "number", key: "autoScrollSpeed", step: "0.1" },
          { kind: "toggle", key: "doubleClickScroll" },
        ],
      },
      {
        title: "group.chapterEnd",
        rows: [
          { kind: "select", key: "chapterEndAction", options: chapterEndOptions },
          { kind: "toggle", key: "hasPremiumAccess" },
        ],
      },
    ],
  },
  {
    key: "site",
    title: "tab.site",
    groups: [
      {
        title: "group.hide",
        checklist: [
          { key: "adBlock" },
          { key: "hideSlider" },
          { key: "hideToraka" },
          { key: "hidePopularSection" },
          { key: "hideAnnouncements" },
          { key: "hideNovelPromos" },
          { key: "hideComments" },
          { key: "hideReactions" },
          { key: "hideDefaultBackToTop" },
        ],
      },
      {
        title: "group.enhancements",
        rows: [
          { kind: "toggle", key: "colorTimestamps" },
          { kind: "toggle", key: "compactSidebar" },
          { kind: "toggle", key: "menuSeriesOverhaul" },
        ],
      },
    ],
  },
  {
    key: "library",
    title: "tab.library",
    groups: [
      {
        title: "group.history",
        rows: [
          { kind: "toggle", key: "trackReadingHistory" },
          { kind: "toggle", key: "resumeChapterPosition", requires: "trackReadingHistory" },
          { kind: "toggle", key: "showNewChapterBadges", requires: "trackReadingHistory" },
        ],
        content: "history",
      },
      {
        title: "group.filters",
        rows: [{ kind: "toggle", key: "seriesFilters" }],
        content: "filters",
      },
    ],
  },
  {
    key: "appearance",
    title: "tab.appearance",
    groups: [
      {
        title: "group.theme",
        rows: [
          { kind: "palette", key: "themePreset", options: () => THEME_PRESET_OPTIONS },
          { kind: "toggle", key: "customAccentEnabled" },
          { kind: "color", key: "customAccent", requires: "customAccentEnabled" },
        ],
      },
      {
        title: "group.language",
        rows: [{ kind: "select", key: "language", options: languageOptions }],
      },
    ],
  },
  {
    key: "shortcuts",
    title: "tab.shortcuts",
    groups: [{ content: "shortcuts" }],
  },
  {
    key: "backup",
    title: "tab.backup",
    footer: true,
    groups: [{ title: "group.settingsData", content: "settingsData" }],
  },
];

export { SETTINGS_PAGES };
