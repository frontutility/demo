export function normalizeSearchText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearchQuery(query, fields = []) {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  if (!terms.length) return true;

  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}
