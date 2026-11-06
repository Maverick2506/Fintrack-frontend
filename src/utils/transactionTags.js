// Tags and notes on a transaction. The server stores tags lowercase with no "#" (same rule as here),
// so "Work", "#work" and "work" are one tag.

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
export const MAX_NOTES_LENGTH = 1000;

/** One tag as stored: trimmed, no leading "#", inner spaces collapsed, lowercase. "" when nothing is left. */
export const normalizeTag = (tag) =>
  String(tag ?? "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Adds the tags typed in the box (commas separate several) to the list: normalized, no repeats,
 * at most MAX_TAGS, each cut to MAX_TAG_LENGTH.
 */
export const addTags = (tags, text) => {
  const next = [...(tags || [])];
  for (const part of String(text ?? "").split(",")) {
    const tag = normalizeTag(part).slice(0, MAX_TAG_LENGTH).trim();
    if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
  }
  return next;
};

/** A row's tags as an array (rows saved before tags existed have none) */
export const tagsOf = (row) => (Array.isArray(row?.tags) ? row.tags : []);

/** Whether a row carries the tag; "all" (or nothing) matches every row */
export const matchesTag = (row, tag) => !tag || tag === "all" || tagsOf(row).includes(normalizeTag(tag));

/** Every tag used in the rows, most used first, then A to Z */
export const collectTags = (rows) => {
  const counts = new Map();
  for (const row of rows || []) {
    for (const tag of tagsOf(row)) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
};

