import { isConfigKey } from "../config/defaults.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import { ConfigStore } from "../store/configStore.js";
import type { SettingsWindow } from "./settingsWindow.js";

function notifyChanged(win: SettingsWindow, key: ConfigKey, value: AppConfig[ConfigKey]): void {
  win.status.settingChanged();
  win.onConfigChanged(key, value);
}

// Rows that depend on another setting are disabled while that setting blocks them.
function syncDependencies(overlay: ParentNode): void {
  overlay.querySelectorAll<HTMLElement>("[data-au-requires], [data-au-disabled-when]").forEach((el) => {
    const requires = el.getAttribute("data-au-requires");
    const disabledWhen = el.getAttribute("data-au-disabled-when");
    const isDisabled =
      (isConfigKey(requires) && !ConfigStore.get(requires)) ||
      (isConfigKey(disabledWhen) && !!ConfigStore.get(disabledWhen));
    el.classList.toggle("is-disabled", isDisabled);
    el.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((control) => {
      control.disabled = isDisabled;
    });
  });
}

function bindPalette(win: SettingsWindow, palette: HTMLElement): void {
  const key = palette.getAttribute("data-key");
  const trigger = palette.querySelector<HTMLButtonElement>(".au-palette-trigger");
  const current = palette.querySelector<HTMLElement>(".au-palette-current");
  const menu = palette.querySelector<HTMLElement>(".au-palette-menu");
  const options = Array.from(palette.querySelectorAll<HTMLElement>("[data-au-option]"));
  if (!isConfigKey(key) || !trigger || !current || !menu) return;

  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) (options.find((option) => option.getAttribute("aria-selected") === "true") ?? options[0])?.focus();
  };

  const choose = (option: HTMLElement) => {
    const value = ConfigStore.set(key, option.getAttribute("data-au-option"));
    options.forEach((candidate) => candidate.setAttribute("aria-selected", candidate === option ? "true" : "false"));
    // Cloning keeps the swatch colors, which serialized markup would drop under a strict CSP.
    current.replaceChildren(...Array.from(option.childNodes, (node) => node.cloneNode(true)));
    setOpen(false);
    trigger.focus();
    notifyChanged(win, key, value);
  };

  trigger.onclick = () => setOpen(trigger.getAttribute("aria-expanded") !== "true");
  trigger.onkeydown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    setOpen(true);
  };
  options.forEach((option) => {
    option.onclick = () => choose(option);
  });
  menu.onkeydown = (e) => {
    const index = e.target instanceof HTMLElement ? options.indexOf(e.target) : -1;
    const move = (next: number) => options[(next + options.length) % options.length]?.focus();
    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(options.length - 1);
    else if ((e.key === "Enter" || e.key === " ") && options[index]) choose(options[index]);
    else if (e.key === "Escape") {
      setOpen(false);
      trigger.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };
  // Any press outside the dropdown closes it.
  win.overlay.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !(e.target instanceof Node && palette.contains(e.target))) setOpen(false);
  });
}

// Connects the controls rendered from the settings layout to the config store.
export function bindSettingControls(win: SettingsWindow): void {
  const { overlay } = win;
  syncDependencies(overlay);

  overlay.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach((input) => {
    input.onchange = () => {
      const key = input.getAttribute("data-key");
      if (!isConfigKey(key)) return;
      ConfigStore.set(key, input.checked);
      notifyChanged(win, key, input.checked);
      syncDependencies(overlay);
    };
  });

  overlay.querySelectorAll<HTMLInputElement>(".au-input-num[data-key]").forEach((input) => {
    input.onchange = () => {
      const key = input.getAttribute("data-key");
      if (!isConfigKey(key)) return;
      const value = ConfigStore.set(key, input.value);
      input.value = String(value);
      notifyChanged(win, key, value);
    };
  });

  overlay.querySelectorAll<HTMLInputElement>(".au-input-color[data-key]").forEach((input) => {
    // "input" fires while the picker is open, giving a live preview.
    input.oninput = () => {
      const key = input.getAttribute("data-key");
      if (!isConfigKey(key)) return;
      notifyChanged(win, key, ConfigStore.set(key, input.value));
    };
  });

  overlay.querySelectorAll<HTMLSelectElement>(".au-input-select[data-key]").forEach((select) => {
    select.onchange = () => {
      const key = select.getAttribute("data-key");
      if (!isConfigKey(key)) return;
      const value = ConfigStore.set(key, select.value);
      select.value = String(value);
      notifyChanged(win, key, value);
      // A language change rewrites every label in the window, so it is rendered again in place.
      if (key === "language") win.rerender(undefined, '[data-key="language"]');
    };
  });

  // Swatch colors are set through the style object, which a page's CSP cannot block the way it can
  // block inline style attributes in markup.
  overlay.querySelectorAll<HTMLElement>("[data-au-swatch]").forEach((swatch) => {
    swatch.style.backgroundColor = swatch.getAttribute("data-au-swatch") ?? "";
  });

  overlay.querySelectorAll<HTMLElement>("[data-au-palette]").forEach((palette) => bindPalette(win, palette));
}
