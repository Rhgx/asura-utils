import { getLocale } from "../i18n/index.js";

// Lowercases and strips accents so "gorunum" finds "Görünüm" and "pagina" finds "página".
// Lowercasing runs first so Turkish "İ" becomes "i" before its dot would be stripped.
export function searchText(text: string): string {
  return text
    .toLocaleLowerCase(getLocale())
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Every word of the query must appear somewhere in the item's text, in any order.
export function matchesSearch(haystack: string, query: string): boolean {
  return searchText(query)
    .split(" ")
    .every((word) => haystack.includes(word));
}

// The id a rendered search target carries, so a result can find its element again.
export function searchItemId(kind: "row" | "check" | "action" | "shortcut", key: string): string {
  return `${kind}:${key}`;
}
