import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const presetDir = new URL("../src/theme/presets/", import.meta.url);

function readTokens(file: string): Record<string, string> {
  const parsed: unknown = JSON.parse(readFileSync(new URL(file, presetDir), "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("tokens" in parsed)) return {};
  const tokens = parsed.tokens;
  if (typeof tokens !== "object" || tokens === null) return {};
  return Object.fromEntries(
    Object.entries(tokens).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;

describe("theme presets", () => {
  for (const file of readdirSync(presetDir).filter((name) => name.endsWith(".json"))) {
    const tokens = readTokens(file);
    // Asura Classic relies on the base tokens, which are covered by the site defaults.
    if (!tokens["--auo-accent"]) continue;

    it(`${file} keeps accent labels and body text readable`, () => {
      const accent = tokens["--auo-accent"] ?? "";
      const onAccent = tokens["--auo-on-accent"] ?? "";
      const text = tokens["--auo-text"] ?? "";
      const dim = tokens["--auo-text-dim"] ?? "";
      const bg = tokens["--auo-bg"] ?? "";
      for (const value of [accent, onAccent, text, dim, bg]) assert.match(value, HEX);

      assert.ok(contrast(onAccent, accent) >= 4.5, `on-accent contrast ${contrast(onAccent, accent).toFixed(2)}`);
      assert.ok(contrast(text, bg) >= 7, `text contrast ${contrast(text, bg).toFixed(2)}`);
      assert.ok(contrast(dim, bg) >= 4.5, `dim text contrast ${contrast(dim, bg).toFixed(2)}`);
    });
  }
});
