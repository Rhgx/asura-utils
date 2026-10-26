import { it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/i18n/en.js";
import { es } from "../src/i18n/es.js";
import { id } from "../src/i18n/id.js";
import { ptBR } from "../src/i18n/ptBR.js";
import { tr } from "../src/i18n/tr.js";
import { resolveLocale } from "../src/i18n/index.js";

it("maps browser languages to supported locales when the setting is auto", () => {
  assert.equal(resolveLocale("auto", ["pt-PT"]), "pt-BR");
  assert.equal(resolveLocale("auto", ["de-DE", "tr-TR"]), "tr");
  assert.equal(resolveLocale("auto", ["in"]), "id");
  assert.equal(resolveLocale("auto", ["de-DE"]), "en");
  assert.equal(resolveLocale("es", ["tr-TR"]), "es");
});

// Key parity is enforced by the Record<MessageKey, string> types; placeholders are not.
it("keeps every English placeholder in every translation", () => {
  const catalogs: Record<string, Record<string, string>> = { tr, es, "pt-BR": ptBR, id };
  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const [key, english] of Object.entries(en)) {
      for (const match of english.matchAll(/\{(\w+)\}/g)) {
        assert.ok(catalog[key]?.includes(match[0]), `${locale} ${key} is missing ${match[0]}`);
      }
    }
  }
});
