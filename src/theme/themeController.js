import { DEFAULTS } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import { BASE_THEME_TOKENS, THEME_PRESETS } from "./themePresets.js";

export const ThemeController = {
  activeThemeKey: DEFAULTS.themePreset,
  appliedThemeKey: "",
  bodyThemeObserver: null,

  resolveTheme(themeKey) {
    const key = ConfigStore.sanitize("themePreset", themeKey);
    const preset = THEME_PRESETS[key] || THEME_PRESETS[DEFAULTS.themePreset];
    return {
      key,
      label: preset.label,
      tokens: {
        ...BASE_THEME_TOKENS,
        ...preset.tokens,
      },
    };
  },

  applyThemeToBody(themeKey) {
    if (!document.body) return false;
    document.body.classList.add("au-theme-enabled");
    document.body.setAttribute("data-au-theme", themeKey);
    return true;
  },

  ensureBodyTheme(themeKey) {
    if (this.applyThemeToBody(themeKey)) {
      if (this.bodyThemeObserver) {
        this.bodyThemeObserver.disconnect();
        this.bodyThemeObserver = null;
      }
      return;
    }

    if (this.bodyThemeObserver || !document.documentElement) return;
    this.bodyThemeObserver = new MutationObserver(() => {
      if (this.applyThemeToBody(themeKey) && this.bodyThemeObserver) {
        this.bodyThemeObserver.disconnect();
        this.bodyThemeObserver = null;
      }
    });
    this.bodyThemeObserver.observe(document.documentElement, { childList: true });
  },

  apply(themeKey) {
    const resolved = this.resolveTheme(themeKey);
    const root = document.documentElement;
    if (!root) return resolved.key;

    // run() re-applies the theme after every DOM mutation batch; skip the
    // token rewrite when nothing changed and only keep body markers synced.
    const alreadyApplied =
      this.appliedThemeKey === resolved.key &&
      root.getAttribute("data-au-theme") === resolved.key;
    if (alreadyApplied) {
      this.ensureBodyTheme(resolved.key);
      return resolved.key;
    }

    Object.entries(resolved.tokens).forEach(([token, value]) => {
      root.style.setProperty(token, value);
    });

    this.activeThemeKey = resolved.key;
    this.appliedThemeKey = resolved.key;
    root.classList.add("au-theme-enabled");
    root.setAttribute("data-au-theme", resolved.key);
    this.ensureBodyTheme(resolved.key);

    return resolved.key;
  },
};
