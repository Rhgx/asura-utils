import { en } from "./en.js";
import type { MessageKey } from "./en.js";
import { tr } from "./tr.js";
import { es } from "./es.js";
import { ptBR } from "./ptBR.js";
import { id } from "./id.js";

// Pure module: no ConfigStore or GM imports, so the unit tests and pure controller modules can load it.

export type { MessageKey } from "./en.js";

export const SUPPORTED_LOCALES = ["en", "tr", "es", "pt-BR", "id"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

type Params = Record<string, string | number>;

// Bases that have both a .one and a .other key, so tPlural rejects anything else.
type PluralBase = {
  [K in MessageKey]: K extends `${infer Base}.one`
    ? `${Base}.other` extends MessageKey
      ? Base
      : never
    : never;
}[MessageKey];

const CATALOGS: Readonly<Record<Locale, Record<MessageKey, string>>> = {
  en,
  tr,
  es,
  "pt-BR": ptBR,
  id,
};

const LOCALE_SET: ReadonlySet<string> = new Set<string>(SUPPORTED_LOCALES);
const PLACEHOLDER = /\{(\w+)\}/g;
// Legacy language codes that browsers still report for a supported language.
const LEGACY_BASE_CODES: Readonly<Record<string, string>> = { in: "id" };

let activeLocale: Locale = "en";

function isLocale(value: string): value is Locale {
  return LOCALE_SET.has(value);
}

// Full tags match first (pt-BR), then the base language (pt-PT, pt, and pt-BR all reach pt-BR).
function matchBrowserLanguage(tag: string): Locale | null {
  const normalized = tag.toLowerCase();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized);
  if (exact) return exact;

  const base = normalized.split("-")[0] ?? "";
  const wanted = LEGACY_BASE_CODES[base] ?? base;
  return SUPPORTED_LOCALES.find((locale) => locale.split("-")[0] === wanted) ?? null;
}

export function resolveLocale(setting: string, browserLanguages: readonly string[]): Locale {
  if (setting !== "auto") return isLocale(setting) ? setting : "en";

  for (const tag of browserLanguages) {
    const match = matchBrowserLanguage(tag);
    if (match) return match;
  }
  return "en";
}

export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

// An empty value in a locale falls back to English, and a missing English value falls back to the key.
function resolveMessage(
  catalog: Partial<Record<MessageKey, string>>,
  key: MessageKey,
  params?: Params
): string {
  const template = catalog[key] || en[key] || key;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params?.[name];
    return value === undefined ? match : String(value);
  });
}

export function t(key: MessageKey, params?: Params): string {
  return resolveMessage(CATALOGS[activeLocale], key, params);
}

// Only "one" gets the singular form; every other category uses .other.
function pluralCategory(locale: Locale, count: number): "one" | "other" {
  return new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
}

// Percent sign placement differs by language ("45%", "%45", "45 %"), so let Intl place it.
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(activeLocale, { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
}

export function tPlural(base: PluralBase, count: number, params?: Params): string {
  return t(`${base}.${pluralCategory(activeLocale, count)}`, { ...params, count });
}
