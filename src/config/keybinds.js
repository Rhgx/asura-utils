const KEYBIND_FIELDS = [
  {
    key: "keybindToggleScroll",
    group: "Reader",
    label: "Toggle Auto Scroll",
    defaultBinding: "KeyS",
    help: "Legacy alt: double-click page",
  },
  {
    key: "keybindSpeedUp",
    group: "Reader",
    label: "Increase Scroll Speed",
    defaultBinding: "KeyE",
    help: "Legacy alts: +, Numpad +",
  },
  {
    key: "keybindSpeedDown",
    group: "Reader",
    label: "Decrease Scroll Speed",
    defaultBinding: "KeyQ",
    help: "Legacy alts: -, Numpad -",
  },
  {
    key: "keybindNextChapter",
    group: "Reader",
    label: "Next Chapter",
    defaultBinding: "KeyD",
    help: "Legacy alts: ArrowRight, PageDown, ]",
  },
  {
    key: "keybindPrevChapter",
    group: "Reader",
    label: "Previous Chapter",
    defaultBinding: "KeyA",
    help: "Legacy alts: ArrowLeft, PageUp, [",
  },
  {
    key: "keybindGoSeries",
    group: "Reader",
    label: "Go To Series",
    defaultBinding: "KeyB",
  },
  {
    key: "keybindToggleFitWidth",
    group: "Reader",
    label: "Toggle Fit Width",
    defaultBinding: "KeyW",
  },
  {
    key: "keybindFocusSearch",
    group: "Series",
    label: "Focus Search",
    defaultBinding: "KeyC",
  },
  {
    key: "keybindJumpChapters",
    group: "Series",
    label: "Jump To Chapters",
    defaultBinding: "KeyL",
  },
];

const KEYBIND_DEFAULTS = Object.fromEntries(
  KEYBIND_FIELDS.map((field) => [field.key, field.defaultBinding])
);

const KEY_FALLBACK_MAP = {
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

function normalizeBinding(binding) {
  if (binding === null || binding === undefined) return "";
  const value = String(binding).trim();
  return value;
}

function bindingToLabel(binding) {
  const code = normalizeBinding(binding);
  if (!code) return "Unassigned";
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

function normalizeEventToBinding(event) {
  if (!event || event.ctrlKey || event.metaKey || event.altKey) return "";
  const code = normalizeBinding(event.code);
  if (BLOCKED_CODES.has(code)) return "";
  return code;
}

function normalizeKeyToCode(key) {
  const raw = key === null || key === undefined ? "" : String(key);
  if (!raw) return "";
  if (KEY_FALLBACK_MAP[raw]) return KEY_FALLBACK_MAP[raw];
  if (/^[a-z]$/i.test(raw)) return `Key${raw.toUpperCase()}`;
  if (/^[0-9]$/.test(raw)) return `Digit${raw}`;
  return "";
}

function matchesBinding(event, binding) {
  const target = normalizeBinding(binding);
  if (!target || !event) return false;
  if (event.code === target) return true;
  const fallback = normalizeKeyToCode(event.key);
  return !!fallback && fallback === target;
}

export {
  KEYBIND_DEFAULTS,
  KEYBIND_FIELDS,
  bindingToLabel,
  matchesBinding,
  normalizeEventToBinding,
};
