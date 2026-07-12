import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const userFile = path.join(distDir, "asura-utils.user.js");
const metaFile = path.join(distDir, "asura-utils.meta.js");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readFileSafe(filePath: string): string {
  assert(fs.existsSync(filePath), `Missing build artifact: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

type Metadata = Map<string, string[]>;

function parseMeta(content: string): Metadata {
  const lines = content.split(/\r?\n/);
  const map: Metadata = new Map();
  for (const line of lines) {
    const m = line.match(/^\/\/\s*@([^\s]+)\s+(.+)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    const value = m[2]!.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(value);
  }
  return map;
}

function verifyHeader(content: string, filePath: string): void {
  // Check the whole file for the footer because the bundled script sits between both markers.
  const top = content.slice(0, 400);
  assert(top.includes("// ==UserScript=="), `Missing userscript header in ${filePath}`);
  assert(content.includes("// ==/UserScript=="), `Missing userscript footer in ${filePath}`);
}

function verifyMeta(meta: Metadata, filePath: string): void {
  const requiredKeys = ["name", "namespace", "license", "match", "run-at"];
  for (const key of requiredKeys) {
    assert(meta.has(key), `Missing @${key} in ${filePath}`);
  }

  assert(meta.get("name")?.includes("Asura Utils"), `Unexpected @name in ${filePath}`);
  assert(
    meta.get("namespace")?.includes("http://tampermonkey.net/"),
    `Unexpected @namespace in ${filePath}`
  );
  assert(
    meta.get("license")?.includes("GPL-3.0-only"),
    `Unexpected @license in ${filePath}`
  );
  assert(
    meta.get("match")?.includes("https://asurascans.com/*"),
    `Unexpected @match in ${filePath}`
  );
  assert(
    meta.get("run-at")?.includes("document-start"),
    `Unexpected @run-at in ${filePath}`
  );
}

function verifyGrants(meta: Metadata, filePath: string): void {
  // Both files must request the same storage access or update installs can lose permissions.
  const grants = meta.get("grant") || [];
  assert(grants.includes("GM_getValue"), `Missing @grant GM_getValue in ${filePath}`);
  assert(grants.includes("GM_setValue"), `Missing @grant GM_setValue in ${filePath}`);
}

function verifyUpdates(meta: Metadata, filePath: string): void {
  assert(
    meta.get("updateURL")?.includes(
      "https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.meta.js"
    ),
    `Unexpected @updateURL in ${filePath}`
  );
  assert(
    meta.get("downloadURL")?.includes(
      "https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js"
    ),
    `Unexpected @downloadURL in ${filePath}`
  );
}

const userJs = readFileSafe(userFile);
const metaJs = readFileSafe(metaFile);

verifyHeader(userJs, userFile);
verifyHeader(metaJs, metaFile);

const userMeta = parseMeta(userJs);
const metaMeta = parseMeta(metaJs);

verifyMeta(userMeta, userFile);
verifyMeta(metaMeta, metaFile);
verifyGrants(userMeta, userFile);
verifyGrants(metaMeta, metaFile);
verifyUpdates(userMeta, userFile);
verifyUpdates(metaMeta, metaFile);

console.log("Build verification passed.");
