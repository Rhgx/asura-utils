import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatUnlockCountdown,
  parseChapterReaderProps,
} from "../src/controllers/chapterProps.js";

function readFixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

describe("parseChapterReaderProps", () => {
  it("parses a free chapter fixture", () => {
    const info = parseChapterReaderProps(readFixture("chapter-free.props.json"));
    assert.deepEqual(info, {
      isLocked: false,
      isPremium: false,
      unlockTime: null,
      pageCount: 3,
      pageUrls: [
        "https://cdn.asurascans.com/asura-images/chapters/academys-genius-swordmaster/159/7852e0.webp?v=1792327660",
        "https://cdn.asurascans.com/asura-images/chapters/academys-genius-swordmaster/159/4f8f42.webp?v=1792327660",
        "https://cdn.asurascans.com/asura-images/chapters/academys-genius-swordmaster/159/bac657.webp?v=1792327660",
      ],
    });
  });

  it("parses a locked premium chapter fixture", () => {
    const info = parseChapterReaderProps(readFixture("chapter-locked.props.json"));
    assert.deepEqual(info, {
      isLocked: true,
      isPremium: true,
      unlockTime: "2026-10-25T20:57:32.947811Z",
      pageCount: 0,
      pageUrls: [],
    });
  });

  it("returns null for invalid JSON", () => {
    assert.equal(parseChapterReaderProps("{not json"), null);
  });

  it("returns null for JSON null", () => {
    assert.equal(parseChapterReaderProps("null"), null);
  });

  it("returns null for a JSON array", () => {
    assert.equal(parseChapterReaderProps("[]"), null);
  });

  it("sets fields to null when keys are missing", () => {
    assert.deepEqual(parseChapterReaderProps("{}"), {
      isLocked: null,
      isPremium: null,
      unlockTime: null,
      pageCount: null,
      pageUrls: [],
    });
  });
});

describe("formatUnlockCountdown", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  it("returns null when there is no unlock time", () => {
    assert.equal(formatUnlockCountdown(null, now), null);
  });

  it("returns null for an unparseable unlock time", () => {
    assert.equal(formatUnlockCountdown("not a date", now), null);
  });

  it("returns null when the unlock time has passed", () => {
    assert.equal(formatUnlockCountdown(at(-60_000), now), null);
  });

  it("shows under a minute for less than 60 seconds", () => {
    assert.equal(formatUnlockCountdown(at(30_000), now), "in under a minute");
  });

  it("shows minutes", () => {
    assert.equal(formatUnlockCountdown(at(12 * 60_000), now), "in 12m");
  });

  it("shows hours and minutes", () => {
    assert.equal(formatUnlockCountdown(at((2 * 60 + 17) * 60_000), now), "in 2h 17m");
  });

  it("shows days and hours", () => {
    assert.equal(formatUnlockCountdown(at((3 * 24 + 4) * 3_600_000), now), "in 3d 4h");
  });
});
