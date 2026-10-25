import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TIMESTAMP_PATTERN, getTimestampAgeClass } from "../src/controllers/timestampAge.js";

// Local time keeps the date-only cases independent of the machine's timezone.
const now = new Date(2026, 9, 25, 12).getTime();

describe("TIMESTAMP_PATTERN", () => {
  it("matches relative and absolute timestamp labels", () => {
    for (const label of ["just now", "3 hours ago", "3h", "last week", "Oct 20, 2026", "2026-10-20"]) {
      assert.equal(TIMESTAMP_PATTERN.test(label), true, label);
    }
  });

  it("does not match plain chapter text", () => {
    assert.equal(TIMESTAMP_PATTERN.test("Chapter 159"), false);
  });
});

describe("getTimestampAgeClass", () => {
  it("classifies very recent labels as fresh", () => {
    assert.equal(getTimestampAgeClass("just now", now), "au-timestamp-fresh");
    assert.equal(getTimestampAgeClass("today", now), "au-timestamp-fresh");
    assert.equal(getTimestampAgeClass("3 hours ago", now), "au-timestamp-fresh");
    assert.equal(getTimestampAgeClass("3h", now), "au-timestamp-fresh");
  });

  it("classifies labels between 6 and 24 hours as recent", () => {
    assert.equal(getTimestampAgeClass("12 hours ago", now), "au-timestamp-recent");
    assert.equal(getTimestampAgeClass("yesterday", now), "au-timestamp-recent");
  });

  it("classifies labels between 1 and 7 days as week", () => {
    assert.equal(getTimestampAgeClass("2 days ago", now), "au-timestamp-week");
    assert.equal(getTimestampAgeClass("last week", now), "au-timestamp-week");
  });

  it("classifies labels older than a week as old", () => {
    assert.equal(getTimestampAgeClass("3 weeks ago", now), "au-timestamp-old");
    assert.equal(getTimestampAgeClass("last month", now), "au-timestamp-old");
    assert.equal(getTimestampAgeClass("2mo", now), "au-timestamp-old");
  });

  it("ages absolute dates relative to now", () => {
    assert.equal(getTimestampAgeClass("Oct 20, 2026", now), "au-timestamp-week");
    assert.equal(getTimestampAgeClass("Sep 1, 2026", now), "au-timestamp-old");
  });

  it("anchors yearless dates to the current year", () => {
    assert.equal(getTimestampAgeClass("Oct 24", now), "au-timestamp-week");
  });

  it("rolls a yearless future date back one year", () => {
    // Dec 25 2026 is in the future, so it refers to Dec 25 2025 (old).
    assert.equal(getTimestampAgeClass("Dec 25", now), "au-timestamp-old");
  });
});
