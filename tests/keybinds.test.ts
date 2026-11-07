import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KEYBIND_DEFAULTS,
  KEYBIND_FIELDS,
  findKeybindConflict,
  matchesBinding,
  matchesReaderAlternate,
} from "../src/config/keybinds.js";
import type { KeybindKey } from "../src/config/keybinds.js";

const defaults = (key: KeybindKey) => KEYBIND_DEFAULTS[key];

describe("keybinds", () => {
  it("gives every action a different default key", () => {
    const bindings = KEYBIND_FIELDS.map((field) => field.defaultBinding);
    assert.equal(new Set(bindings).size, bindings.length);
  });

  it("finds the action that already holds a key", () => {
    assert.equal(findKeybindConflict("keybindToggleScroll", "KeyD", defaults)?.key, "keybindNextChapter");
  });

  it("does not report an action as conflicting with itself", () => {
    assert.equal(findKeybindConflict("keybindNextChapter", "KeyD", defaults), undefined);
  });

  it("treats clearing a binding as having no conflict", () => {
    const unbound = (key: KeybindKey) => (key === "keybindGoSeries" ? "" : defaults(key));
    assert.equal(findKeybindConflict("keybindToggleScroll", "", unbound), undefined);
  });

  it("matches by physical key, falling back to the key value", () => {
    assert.ok(matchesBinding({ key: "s", code: "KeyS" }, "KeyS"));
    assert.ok(matchesBinding({ key: "s", code: "" }, "KeyS"));
    assert.ok(!matchesBinding({ key: "s", code: "KeyS" }, ""));
  });

  it("keeps the built-in alternates on their own actions", () => {
    assert.ok(matchesReaderAlternate({ key: "]", code: "BracketRight" }, "keybindNextChapter"));
    assert.ok(matchesReaderAlternate({ key: "PageUp", code: "PageUp" }, "keybindPrevChapter"));
    assert.ok(matchesReaderAlternate({ key: "+", code: "Equal" }, "keybindSpeedUp"));
    assert.ok(!matchesReaderAlternate({ key: "]", code: "BracketRight" }, "keybindPrevChapter"));
    assert.ok(!matchesReaderAlternate({ key: "]", code: "BracketRight" }, "keybindGoSeries"));
  });
});
