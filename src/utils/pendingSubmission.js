/**
 * Quick Add retry rule (N2)
 *
 * A save can reach the server even when its response never comes back (timeout during a Render
 * cold start, flaky mobile network). Pressing Save again must send the SAME clientRef so the
 * server can return the row it already stored instead of inserting a duplicate.
 *
 * - The same entry after a failure reuses the pending clientRef.
 * - A different entry gets a new clientRef.
 * - After a successful save the pending state is cleared (null), so a deliberate repeat gets a new one.
 *
 * "Same entry" is judged on the parsed fields, not the raw text, so "7 coffee" retyped as
 * "7.00 Coffee " still counts as the same save. Relative dates (no date typed, "due today",
 * "due tomorrow") are keyed by the word, not the day, so a retry after midnight is still the same save
 * (the server keeps the date of the first save). Typed dates like "due 11/05" are keyed by the date.
 */

export const submissionKey = (parsed) =>
  JSON.stringify([
    parsed.type,
    Number(parsed.amount),
    (parsed.name || "").trim().toLowerCase(),
    parsed.dateKey ?? parsed.date,
    parsed.creditCardId || null,
    parsed.category || null,
    Boolean(parsed.is_paid),
  ]);

export const getClientRef = (pending, parsed, makeId) => {
  const key = submissionKey(parsed);
  if (pending && pending.key === key) {
    return { pending, clientRef: pending.clientRef };
  }
  const next = { key, clientRef: makeId() };
  return { pending: next, clientRef: next.clientRef };
};
