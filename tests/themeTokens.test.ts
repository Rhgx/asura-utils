import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));
const baseTokenFile = join(srcDir, "theme", "baseThemeTokens.json");
const presetDir = join(srcDir, "theme", "presets");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|css)$/.test(name) ? [path] : [];
  });
}

const TOKEN = /--auo?-[a-z0-9-]+/g;
const baseTokens: Record<string, string> = JSON.parse(readFileSync(baseTokenFile, "utf8"));

describe("theme tokens", () => {
  // Tokens are read through var() in CSS and by name in code, so a removed token fails silently at runtime.
  it("defines every token the source refers to", () => {
    const sources = sourceFiles(srcDir).map((path) => readFileSync(path, "utf8")).join("\n");
    const declaredInCss = [...sources.matchAll(/(--auo?-[a-z0-9-]+)\s*:/g)].map((match) => match[1]);
    const setAtRuntime = [...sources.matchAll(/setProperty\(\s*["'`](--auo?-[a-z0-9-]+)/g)].map((match) => match[1]);
    const defined = new Set([...Object.keys(baseTokens), ...declaredInCss, ...setAtRuntime]);
    const missing = [...new Set(sources.match(TOKEN))].filter((token) => !defined.has(token));
    assert.deepEqual(missing, []);
  });

  it("only overrides tokens that exist, in every preset", () => {
    for (const file of readdirSync(presetDir).filter((name) => name.endsWith(".json"))) {
      const preset: { tokens?: Record<string, string> } = JSON.parse(readFileSync(join(presetDir, file), "utf8"));
      const unknown = Object.keys(preset.tokens ?? {}).filter((token) => !(token in baseTokens));
      assert.deepEqual(unknown, [], file);
    }
  });
});
