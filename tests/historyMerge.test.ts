import { it } from "node:test";
import assert from "node:assert/strict";
import { mergeHistory, parseHistoryImport } from "../src/store/historyStore.js";
import type { HistoryEntry } from "../src/store/historyStore.js";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    title: "Overgeared",
    lastChapter: "3",
    lastHref: "/comics/overgeared-3ebcc5a9/chapter/3",
    lastTs: 1000,
    lastProgress: 40,
    read: [],
    ...overrides,
  };
}

it("imports both export shapes and drops invalid or off-site entries", () => {
  const history = { good: entry() };
  assert.deepEqual(parseHistoryImport({ version: 1, history }), history);
  assert.deepEqual(
    Object.keys(parseHistoryImport({ ...history, bad: "oops", offSite: entry({ lastHref: "https://example.com/x" }) })),
    ["good"]
  );
});

it("merges by newest entry, combines read chapters, and keeps local-only series", () => {
  const current = { a: entry({ lastTs: 1000, lastChapter: "3", read: ["1", "2"] }), local: entry() };
  const incoming = { a: entry({ lastTs: 3000, lastChapter: "9", read: ["8"] }) };
  const merged = mergeHistory(current, incoming);
  assert.equal(merged["a"]?.lastChapter, "9");
  assert.deepEqual(merged["a"]?.read, ["1", "2", "8"]);
  assert.ok(merged["local"]);
});
