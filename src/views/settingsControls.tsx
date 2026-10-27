import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import { CONFIG_META } from "../config/defaults.js";
import type {
  ChecklistItem,
  PaletteOption,
  SettingRow,
} from "../config/settingsLayout.js";
import { t } from "../i18n/index.js";
import { ChevronIcon } from "./settingsIcons.js";
import { searchItemId } from "./settingsSearch.js";

export type OnConfigChanged = (key: ConfigKey, value: AppConfig[ConfigKey]) => void;
// Writes a value through the sanitizing store and returns what was actually stored.
export type WriteConfig = (key: ConfigKey, raw: unknown) => AppConfig[ConfigKey];

// Rows that depend on another setting are disabled while that setting blocks them.
function isDisabled(item: Pick<SettingRow, "requires" | "disabledWhen">, cfg: AppConfig): boolean {
  return (
    (item.requires !== undefined && !cfg[item.requires]) ||
    (item.disabledWhen !== undefined && !!cfg[item.disabledWhen])
  );
}

interface SettingRowViewProps {
  row: SettingRow;
  cfg: AppConfig;
  write: WriteConfig;
}

export function SettingRowView({ row, cfg, write }: SettingRowViewProps) {
  const label = t(`setting.${row.key}.label`);
  const hint = t(`setting.${row.key}.tooltip`);
  const disabled = isDisabled(row, cfg);

  return (
    <div
      class={disabled ? "au-setting-row is-disabled" : "au-setting-row"}
      data-au-item={searchItemId("row", row.key)}
    >
      <div class="au-setting-text">
        <div class="au-setting-label">{label}</div>
        <div class="au-setting-hint">{hint}</div>
      </div>
      <SettingControl row={row} label={label} cfg={cfg} write={write} disabled={disabled} />
    </div>
  );
}

interface SettingControlProps {
  row: SettingRow;
  label: string;
  cfg: AppConfig;
  write: WriteConfig;
  disabled: boolean;
}

function SettingControl({ row, label, cfg, write, disabled }: SettingControlProps) {
  const key = row.key;

  switch (row.kind) {
    case "toggle":
      return (
        <label class="au-toggle">
          <input
            type="checkbox"
            aria-label={label}
            checked={!!cfg[key]}
            disabled={disabled}
            onChange={(e) => write(key, e.currentTarget.checked)}
          />
          <span class="au-slider"></span>
        </label>
      );
    case "number": {
      const meta = CONFIG_META[key];
      return (
        <input
          type="number"
          class="au-input-num"
          aria-label={label}
          step={row.step}
          min={meta?.min}
          max={meta?.max}
          value={String(cfg[key])}
          disabled={disabled}
          onChange={(e) => {
            // Sanitizing can clamp the value back to what was already stored, and then Preact would
            // skip the DOM update, so the field is written directly.
            const value = write(key, e.currentTarget.value);
            e.currentTarget.value = String(value);
          }}
        />
      );
    }
    case "color":
      // "input" fires while the picker is open, giving a live preview.
      return (
        <input
          type="color"
          class="au-input-color"
          aria-label={label}
          value={String(cfg[key])}
          disabled={disabled}
          onInput={(e) => write(key, e.currentTarget.value)}
        />
      );
    case "select":
      return (
        <select
          class="au-input-select"
          aria-label={label}
          value={String(cfg[key])}
          disabled={disabled}
          onChange={(e) => {
            const value = write(key, e.currentTarget.value);
            e.currentTarget.value = String(value);
          }}
        >
          {row.options().map((opt) => (
            <option value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case "palette":
      return (
        <PaletteDropdown
          settingKey={key}
          label={label}
          options={row.options()}
          cfg={cfg}
          write={write}
        />
      );
  }
}

// Swatch colors are set through the style object, which a page's CSP cannot block the way it can
// block inline style attributes in markup.
function PaletteOptionBody({ option }: { option: PaletteOption }) {
  return (
    <>
      <span class="au-swatches" aria-hidden="true">
        {option.swatches.map((color) => (
          <span class="au-swatch" style={{ backgroundColor: color }}></span>
        ))}
      </span>
      <span class="au-palette-name">{option.label}</span>
    </>
  );
}

interface PaletteDropdownProps {
  settingKey: ConfigKey;
  label: string;
  options: readonly PaletteOption[];
  cfg: AppConfig;
  write: WriteConfig;
}

// A native select cannot draw color swatches, so this is a small listbox with keyboard support.
function PaletteDropdown({ settingKey, label, options, cfg, write }: PaletteDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // An unknown stored value falls back to the first option, as the old markup did.
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === String(cfg[settingKey])));
  const selected = options[selectedIndex];

  // Opening moves focus into the menu. The menu is unhidden by the time this layout effect runs.
  useLayoutEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
  }, [open]);

  // Any press outside the dropdown closes it.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const overlay = root?.closest("#au-modal-overlay");
    if (!open || !root || !overlay) return;
    const onPointerDown = (e: Event) => {
      if (!(e.target instanceof Node && root.contains(e.target))) setOpen(false);
    };
    overlay.addEventListener("pointerdown", onPointerDown);
    return () => overlay.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!selected) return null;

  const choose = (opt: PaletteOption) => {
    write(settingKey, opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    setOpen(true);
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const count = options.length;
    const index = optionRefs.current.indexOf(e.target as HTMLDivElement);
    const option = options[index];
    const move = (next: number) => optionRefs.current[(next + count) % count]?.focus();

    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(count - 1);
    else if ((e.key === "Enter" || e.key === " ") && option) choose(option);
    else if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      // Tab leaves the menu like any other control, so its default is left alone.
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div class="au-palette" ref={rootRef}>
      <button
        type="button"
        class="au-palette-trigger"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
        aria-label={label}
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKeyDown}
      >
        <span class="au-palette-current">
          <PaletteOptionBody option={selected} />
        </span>
        <ChevronIcon />
      </button>
      <div
        class="au-palette-menu"
        role="listbox"
        aria-label={label}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
      >
        {options.map((opt, index) => (
          <div
            key={opt.value}
            class="au-palette-option"
            role="option"
            tabIndex={-1}
            aria-selected={index === selectedIndex ? "true" : "false"}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            onClick={() => choose(opt)}
          >
            <PaletteOptionBody option={opt} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChecklistItemViewProps {
  item: ChecklistItem;
  cfg: AppConfig;
  write: WriteConfig;
}

// Checklist items keep the description in a hover tooltip so the grid stays compact.
export function ChecklistItemView({ item, cfg, write }: ChecklistItemViewProps) {
  const label = t(`setting.${item.key}.label`);
  const hint = t(`setting.${item.key}.tooltip`);
  const disabled = isDisabled(item, cfg);

  return (
    <div
      class={disabled ? "au-check is-disabled" : "au-check"}
      data-au-item={searchItemId("check", item.key)}
    >
      <label class="au-check-main">
        <input
          type="checkbox"
          aria-description={hint}
          checked={!!cfg[item.key]}
          disabled={disabled}
          onChange={(e) => write(item.key, e.currentTarget.checked)}
        />
        <span>{label}</span>
      </label>
      <span class="au-control-label" data-tooltip={hint}>
        <span class="au-control-tooltip" aria-hidden="true">?</span>
      </span>
    </div>
  );
}
