import { CONFIG_META, DEFAULTS } from "../config/defaults.js";

export const ConfigStore = {
  sanitize(key, value) {
    const fallback = DEFAULTS[key];
    const meta = CONFIG_META[key] || {};
    const type = meta.type || typeof fallback;

    if (type === "boolean") return !!value;

    if (type === "number") {
      let n = Number(value);
      if (!Number.isFinite(n)) n = Number(fallback || 0);
      if (Number.isFinite(meta.min)) n = Math.max(meta.min, n);
      if (Number.isFinite(meta.max)) n = Math.min(meta.max, n);

      const step = Number(meta.step);
      if (Number.isFinite(step) && step > 0) {
        const decimals = (String(step).split(".")[1] || "").length;
        const factor = Math.pow(10, decimals);
        n = Math.round(n * factor) / factor;
      }
      return n;
    }

    if (type === "string") {
      const str = value === null || value === undefined ? String(fallback || "") : String(value);
      if (Array.isArray(meta.options) && meta.options.length > 0) {
        if (meta.options.includes(str)) return str;
        if (meta.options.includes(String(fallback))) return String(fallback);
        return String(meta.options[0]);
      }
      return str;
    }

    return value === undefined ? fallback : value;
  },

  get(key) {
    const raw = GM_getValue(key, DEFAULTS[key]);
    return this.sanitize(key, raw);
  },

  set(key, value) {
    const clean = this.sanitize(key, value);
    GM_setValue(key, clean);
    return clean;
  },

  toggle(key) {
    const next = !this.get(key);
    this.set(key, next);
    return next;
  },

  getAll() {
    const cfg = {};
    for (const k in DEFAULTS) cfg[k] = this.get(k);
    return cfg;
  },
};

