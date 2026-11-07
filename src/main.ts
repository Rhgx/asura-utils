import "./styles/index.js";
import { installDynamicColorRemaps } from "./styles/dynamic-color-remaps.js";
import { ConfigStore } from "./store/configStore.js";
import { PageController } from "./controllers/pageController.js";
import { ThemeController } from "./theme/themeController.js";
import { resolveLocale, setLocale, t } from "./i18n/index.js";

// Set before anything renders so every label is built in the chosen language.
setLocale(resolveLocale(ConfigStore.get("language"), navigator.languages));
ThemeController.apply(ConfigStore.get("themePreset"));
installDynamicColorRemaps();
// The header gear depends on the site's markup, so settings stay reachable from the userscript menu if that changes.
GM_registerMenuCommand(t("settings.title"), () => PageController.settingsView.toggleModal());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => PageController.init());
} else {
  PageController.init();
}
