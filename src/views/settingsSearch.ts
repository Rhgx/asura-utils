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
