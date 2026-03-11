import baseThemeTokens from "./baseThemeTokens.json";

const presetModules = import.meta.glob("./presets/*.json", { eager: true });

function toPresetKey(filePath) {
  return filePath.split("/").pop().replace(/\.json$/, "");
}

function toPresetRecord(filePath, moduleValue) {
  const raw = moduleValue && typeof moduleValue === "object" && "default" in moduleValue
    ? moduleValue.default
    : moduleValue;

  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid theme preset module at ${filePath}`);
  }

  const key = toPresetKey(filePath);
  const label = typeof raw.label === "string" && raw.label.trim()
    ? raw.label.trim()
    : key;
  const tokens = raw.tokens && typeof raw.tokens === "object" ? raw.tokens : {};
  const order = Number.isFinite(raw.order) ? Number(raw.order) : Number.MAX_SAFE_INTEGER;

  return { key, label, tokens, order };
}

const presetList = Object.entries(presetModules)
  .map(([filePath, moduleValue]) => toPresetRecord(filePath, moduleValue))
  .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

if (presetList.length === 0) {
  throw new Error("No theme presets found in src/theme/presets");
}

const THEME_PRESETS = Object.fromEntries(
  presetList.map(({ key, label, tokens }) => [key, { label, tokens }])
);

const THEME_PRESET_OPTIONS = presetList.map(({ key, label }) => ({
  value: key,
  label,
}));

const BASE_THEME_TOKENS = baseThemeTokens;

export { BASE_THEME_TOKENS, THEME_PRESETS, THEME_PRESET_OPTIONS };
