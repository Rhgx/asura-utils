import baseThemeTokens from "./baseThemeTokens.json";

const presetModules = import.meta.glob("./presets/*.json", { eager: true });

export type ThemeTokens = Record<`--${string}`, string>;
export interface ThemePreset { label: string; tokens: ThemeTokens }
interface PresetRecord extends ThemePreset { key: string; order: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPresetKey(filePath: string): string {
  return filePath.split("/").pop()!.replace(/\.json$/, "");
}

function toPresetRecord(filePath: string, moduleValue: unknown): PresetRecord {
  const raw = isRecord(moduleValue) && "default" in moduleValue
    ? moduleValue["default"]
    : moduleValue;

  if (!isRecord(raw)) {
    throw new Error(`Invalid theme preset module at ${filePath}`);
  }

  const key = toPresetKey(filePath);
  const label = typeof raw["label"] === "string" && raw["label"].trim()
    ? raw["label"].trim()
    : key;
  const tokens = isRecord(raw["tokens"])
    ? Object.fromEntries(Object.entries(raw["tokens"]).filter((entry): entry is [string, string] => typeof entry[1] === "string")) as ThemeTokens
    : {};
  const order = Number.isFinite(raw["order"]) ? Number(raw["order"]) : Number.MAX_SAFE_INTEGER;

  return { key, label, tokens, order };
}

const presetList = Object.entries(presetModules)
  .map(([filePath, moduleValue]) => toPresetRecord(filePath, moduleValue))
  .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

if (presetList.length === 0) {
  throw new Error("No theme presets found in src/theme/presets");
}

const THEME_PRESETS: Record<string, ThemePreset> = Object.fromEntries(
  presetList.map(({ key, label, tokens }) => [key, { label, tokens }])
);

const THEME_PRESET_OPTIONS = presetList.map(({ key, label }) => ({
  value: key,
  label,
}));

const BASE_THEME_TOKENS = baseThemeTokens as ThemeTokens;

export { BASE_THEME_TOKENS, THEME_PRESETS, THEME_PRESET_OPTIONS };
