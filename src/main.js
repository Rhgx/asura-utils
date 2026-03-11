import "./styles/index.js";
import { ConfigStore } from "./store/configStore.js";
import { PageController } from "./controllers/pageController.js";
import { ThemeController } from "./theme/themeController.js";

ThemeController.apply(ConfigStore.get("themePreset"));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => PageController.init());
} else {
  PageController.init();
}
