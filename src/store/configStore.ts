import { CONFIG_META, DEFAULTS } from "../config/defaults.js";
import { LEGACY_THEME_KEYS } from "../theme/themePresets.js";
import type {
  AppConfig,
  BooleanConfigKey,
  ConfigMeta,
  ConfigKey,
} from "../config/defaults.js";

type ConfigValue<K extends ConfigKey> = AppConfig[K];

const cache = new Map<ConfigKey, AppConfig[ConfigKey]>();

export const ConfigStore = {
  sanitize<K extends ConfigKey>(key: K, value: unknown): ConfigValue<K> {
    const fallback = DEFAULTS[key];
    const meta: ConfigMeta = CONFIG_META[key] ?? {};
    const type = meta.type ?? typeof fallback;

    if (type === "boolean") return !!value as ConfigValue<K>;

    if (type === "number") {
      let n = Number(value);
      if (!Number.isFinite(n)) n = Number(fallback || 0);
      if (typeof meta.min === "number" && Number.isFinite(meta.min)) n = Math.max(meta.min, n);
      if (typeof meta.max === "number" && Number.isFinite(meta.max)) n = Math.min(meta.max, n);

      const step = Number(meta.step);
      if (Number.isFinite(step) && step > 0) {
        // Match the setting's decimal precision so repeated edits do not store
        // floating-point values such as 0.30000000000000004.
        const decimals = (String(step).split(".")[1] || "").length;
        const factor = Math.pow(10, decimals);
        n = Math.round(n * factor) / factor;
      }
      return n as ConfigValue<K>;
    }

    if (type === "string") {
      let str = value === null || value === undefined ? String(fallback || "") : String(value);
      if (key === "themePreset") str = LEGACY_THEME_KEYS[str] ?? str;
      if (Array.isArray(meta.options) && meta.options.length > 0) {
        if (meta.options.includes(str)) return str as ConfigValue<K>;
        if (meta.options.includes(String(fallback))) return String(fallback) as ConfigValue<K>;
        return String(meta.options[0]) as ConfigValue<K>;
      }
      return str as ConfigValue<K>;
    }

    return (value === undefined ? fallback : value) as ConfigValue<K>;
  },

  get<K extends ConfigKey>(key: K): ConfigValue<K> {
    // Userscript storage reads are synchronous, so keep sanitized values in
    // memory after the first access.
    if (cache.has(key)) return cache.get(key) as ConfigValue<K>;
    const raw = GM_getValue(key, DEFAULTS[key]);
    const clean = this.sanitize(key, raw);
    cache.set(key, clean);
    return clean;
  },

  set<K extends ConfigKey>(key: K, value: unknown): ConfigValue<K> {
    const clean = this.sanitize(key, value);
    cache.set(key, clean);
    GM_setValue(key, clean);
    return clean;
  },

  toggle(key: BooleanConfigKey): boolean {
    const next = !this.get(key);
    this.set(key, next);
    return next;
  },

  getAll(): AppConfig {
    const cfg = {} as AppConfig;
    for (const k of Object.keys(DEFAULTS) as ConfigKey[]) {
      (cfg[k] as AppConfig[ConfigKey]) = this.get(k);
    }
    return cfg;
  },
};
