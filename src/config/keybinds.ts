import { t } from "../i18n/index.js";

// Labels, help text, and groups are catalog keys so they are translated when rendered.
const KEYBIND_FIELDS = [
  {
    key: "keybindToggleScroll",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindToggleScroll.label",
    helpKey: "keybind.keybindToggleScroll.help",
    defaultBinding: "KeyS",
  },
  {
    key: "keybindSpeedUp",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindSpeedUp.label",
    helpKey: "keybind.keybindSpeedUp.help",
    defaultBinding: "KeyE",
  },
  {
    key: "keybindSpeedDown",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindSpeedDown.label",
    helpKey: "keybind.keybindSpeedDown.help",
    defaultBinding: "KeyQ",
  },
  {
    key: "keybindNextChapter",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindNextChapter.label",
    helpKey: "keybind.keybindNextChapter.help",
    defaultBinding: "KeyD",
  },
  {
    key: "keybindPrevChapter",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindPrevChapter.label",
    helpKey: "keybind.keybindPrevChapter.help",
    defaultBinding: "KeyA",
  },
  {
    key: "keybindNextPage",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindNextPage.label",
    defaultBinding: "KeyX",
  },
  {
    key: "keybindPrevPage",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindPrevPage.label",
    defaultBinding: "KeyZ",
  },
  {
    key: "keybindGoSeries",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindGoSeries.label",
    defaultBinding: "KeyB",
  },
  {
    key: "keybindToggleFitWidth",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindToggleFitWidth.label",
    defaultBinding: "KeyW",
  },
  {
    key: "keybindToggleDock",
    groupKey: "shortcuts.group.reader",
    labelKey: "keybind.keybindToggleDock.label",
    defaultBinding: "KeyT",
  },
  {
    key: "keybindFocusSearch",
    groupKey: "shortcuts.group.series",
    labelKey: "keybind.keybindFocusSearch.label",
    defaultBinding: "KeyC",
  },
  {
    key: "keybindJumpChapters",
    groupKey: "shortcuts.group.series",
    labelKey: "keybind.keybindJumpChapters.label",
    defaultBinding: "KeyL",
  },
] as const;

export type KeybindKey = (typeof KEYBIND_FIELDS)[number]["key"];
export type KeybindField = (typeof KEYBIND_FIELDS)[number];

const KEYBIND_DEFAULTS = Object.fromEntries(
  KEYBIND_FIELDS.map((field) => [field.key, field.defaultBinding])
) as Record<KeybindKey, string>;

const KEY_FALLBACK_MAP: Readonly<Record<string, string>> = {
  "+": "Equal",
  "=": "Equal",
  "-": "Minus",
  _: "Minus",
  "[": "BracketLeft",
  "]": "BracketRight",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Home: "Home",
  End: "End",
  Enter: "Enter",
  Escape: "Escape",
  Esc: "Escape",
  " ": "Space",
  Spacebar: "Space",
};

const BLOCKED_CODES = new Set([
  "",
  "Unidentified",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
]);

function normalizeBinding(binding: unknown): string {
  if (binding === null || binding === undefined) return "";
  const value = String(binding).trim();
  return value;
}

function bindingToLabel(binding: unknown): string {
  const code = normalizeBinding(binding);
  if (!code) return t("shortcuts.unassigned");
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (code === "Equal") return "+";
  if (code === "Minus") return "-";
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "NumpadAdd") return "Numpad +";
  if (code === "NumpadSubtract") return "Numpad -";
  if (code.startsWith("Arrow")) return code.replace("Arrow", "Arrow ");
  if (code === "PageDown") return "Page Down";
  if (code === "PageUp") return "Page Up";
  return code;
}

function normalizeEventToBinding(event: KeyboardEvent | null | undefined): string {
  if (!event || event.ctrlKey || event.metaKey || event.altKey) return "";
  const code = normalizeBinding(event.code);
  if (BLOCKED_CODES.has(code)) return "";
  return code;
}

function normalizeKeyToCode(key: unknown): string {
  const raw = key === null || key === undefined ? "" : String(key);
  if (!raw) return "";
  if (KEY_FALLBACK_MAP[raw]) return KEY_FALLBACK_MAP[raw];
  if (/^[a-z]$/i.test(raw)) return `Key${raw.toUpperCase()}`;
  if (/^[0-9]$/.test(raw)) return `Digit${raw}`;
  return "";
}

type KeyIdentity = Pick<KeyboardEvent, "key" | "code">;

function matchesBinding(event: KeyIdentity | null | undefined, binding: unknown): boolean {
  const target = normalizeBinding(binding);
  if (!target || !event) return false;
  if (event.code === target) return true;
  // Some browsers or synthetic events omit `code`; convert the older `key`
  // value to the same physical-key format used by saved bindings.
  const fallback = normalizeKeyToCode(event.key);
  return !!fallback && fallback === target;
}

// The action other than `key` that already holds this binding, if any. An empty binding conflicts with nothing.
function findKeybindConflict(
  key: KeybindKey,
  binding: string,
  getBinding: (field: KeybindKey) => string,
): KeybindField | undefined {
  if (!binding) return undefined;
  return KEYBIND_FIELDS.find((field) => field.key !== key && getBinding(field.key) === binding);
}

// Keys that work in the reader without being configured. A key the user has assigned to anything takes priority.
const READER_KEY_ALTERNATES: Partial<Readonly<Record<KeybindKey, (event: KeyIdentity) => boolean>>> = {
  keybindSpeedUp: ({ key, code }) => key === "=" || key === "+" || code === "NumpadAdd",
  keybindSpeedDown: ({ key, code }) => key === "-" || key === "_" || code === "NumpadSubtract",
  keybindNextChapter: ({ key }) => key === "ArrowRight" || key === "PageDown" || key === "]",
  keybindPrevChapter: ({ key }) => key === "ArrowLeft" || key === "PageUp" || key === "[",
};

function matchesReaderAlternate(event: KeyIdentity, key: KeybindKey): boolean {
  return READER_KEY_ALTERNATES[key]?.(event) ?? false;
}

export {
  KEYBIND_DEFAULTS,
  KEYBIND_FIELDS,
  bindingToLabel,
  findKeybindConflict,
  matchesBinding,
  matchesReaderAlternate,
  normalizeEventToBinding,
};
