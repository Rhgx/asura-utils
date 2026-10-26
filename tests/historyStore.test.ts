import { it } from "node:test";
import assert from "node:assert/strict";
import { parseReaderPath, parseSeriesPath } from "../src/store/historyStore.js";

it("keeps comic history keys unchanged and prefixes novel keys", () => {
  assert.equal(parseReaderPath("/comics/overgeared-3ebcc5a9/chapter/3")?.seriesSlug, "overgeared-3ebcc5a9");
  assert.equal(parseSeriesPath("/comics/overgeared-3ebcc5a9"), "overgeared-3ebcc5a9");
  assert.equal(parseReaderPath("/novels/shadow-slave/chapter/12")?.seriesSlug, "novel:shadow-slave");
  assert.equal(parseSeriesPath("/novels/shadow-slave"), "novel:shadow-slave");
  assert.equal(parseSeriesPath("/novels"), "");
});
