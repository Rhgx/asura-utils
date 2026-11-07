import { it } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, searchText } from "../src/views/settingsSearch.js";

it("finds accented text from plain typing", () => {
  assert.equal(searchText("  Görünüm   Ayarları "), "gorunum ayarlari");
  assert.ok(matchesSearch(searchText("Página de la serie"), "pagina"));
});

it("needs every word of the query, in any order", () => {
  const haystack = searchText("Auto-scroll speed");
  assert.ok(matchesSearch(haystack, "speed auto"));
  assert.ok(!matchesSearch(haystack, "speed brightness"));
});
