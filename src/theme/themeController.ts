import { DEFAULTS } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import { BASE_THEME_TOKENS, THEME_PRESETS } from "./themePresets.js";
import type { ThemeTokens } from "./themePresets.js";

export const ThemeController = {
  activeThemeKey: DEFAULTS.themePreset,
  appliedSignature: "",
  bodyThemeObserver: null as MutationObserver | null,

  resolveCustomAccent() {
    if (!ConfigStore.get("customAccentEnabled")) return "";
    const value = String(ConfigStore.get("customAccent") || "").trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "";
  },

  buildCustomAccentTokens(accent: string): ThemeTokens {
    return {
      "--au-accent": accent,
      "--auo-accent": accent,
      "--au-accent-strong": `color-mix(in srgb, ${accent} 68%, black)`,
      "--auo-accent-strong": `color-mix(in srgb, ${accent} 68%, black)`,
      "--au-accent-glow": `color-mix(in srgb, ${accent} 38%, transparent)`,
      "--au-settings-btn-bg": `color-mix(in srgb, ${accent} 68%, black)`,
      "--au-settings-btn-hover": `color-mix(in srgb, ${accent} 54%, black)`,
      "--au-progress-end": `color-mix(in srgb, ${accent} 55%, white)`,
      "--auo-link": `color-mix(in srgb, ${accent} 45%, white)`,
      "--auo-auth-hover-bg": `color-mix(in srgb, ${accent} 54%, black)`,
      "--auo-chapter-hover-border": `color-mix(in srgb, ${accent} 45%, transparent)`,
    };
  },

  resolveTheme(themeKey: unknown) {
    const key = ConfigStore.sanitize("themePreset", themeKey);
    const preset = THEME_PRESETS[key] ?? THEME_PRESETS[DEFAULTS.themePreset];
    if (!preset) throw new Error(`Missing theme preset: ${key}`);
    return {
      key,
      label: preset.label,
      tokens: {
        ...BASE_THEME_TOKENS,
        ...preset.tokens,
      },
    };
  },

  applyThemeToBody(themeKey: string): boolean {
    if (!document.body) return false;
    document.body.classList.add("au-theme-enabled");
    document.body.setAttribute("data-au-theme", themeKey);
    return true;
  },

  ensureBodyTheme(themeKey: string): void {
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

  apply(themeKey: unknown): string {
    const resolved = this.resolveTheme(themeKey);
    const root = document.documentElement;
    if (!root) return resolved.key;

    const customAccent = this.resolveCustomAccent();
    const signature = `${resolved.key}|${customAccent}`;

    // run() re-applies the theme after every DOM mutation batch; skip the
    // token rewrite when nothing changed and only keep body markers synced.
    const alreadyApplied =
      this.appliedSignature === signature &&
      root.getAttribute("data-au-theme") === resolved.key;
    if (alreadyApplied) {
      this.ensureBodyTheme(resolved.key);
      return resolved.key;
    }

    const tokens = customAccent
      ? { ...resolved.tokens, ...this.buildCustomAccentTokens(customAccent) }
      : resolved.tokens;
    Object.entries(tokens).forEach(([token, value]) => {
      root.style.setProperty(token, String(value));
    });

    this.activeThemeKey = resolved.key;
    this.appliedSignature = signature;
    root.classList.add("au-theme-enabled");
    root.setAttribute("data-au-theme", resolved.key);
    if (customAccent) {
      root.setAttribute("data-au-custom-accent", "1");
    } else {
      root.removeAttribute("data-au-custom-accent");
    }
    this.ensureBodyTheme(resolved.key);

    return resolved.key;
  },
};
