/** Plain-text blurb for a card: tags stripped, whitespace collapsed, trimmed to `max`. The legacy bulleted spec dump is not a blurb, so it returns null. */
export function shortText(text: string | null, max = 110) {
  if (!text) return null;
  const t = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.includes("*")) return null;
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}
