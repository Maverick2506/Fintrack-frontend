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

// Same rule for callers that build their own key (Add Transaction keys on its full payload)
export const getClientRefForKey = (pending, key, makeId) => {
  if (pending && pending.key === key) {
    return { pending, clientRef: pending.clientRef };
  }
  const next = { key, clientRef: makeId() };
  return { pending: next, clientRef: next.clientRef };
};

export const getClientRef = (pending, parsed, makeId) =>
  getClientRefForKey(pending, submissionKey(parsed), makeId);

// A retry that races the original request (both delivered together after a cold start) can lose on
// the unique clientRef index. The server answers 409, but the entry is saved, so treat it as success.
export const isDuplicateClientRefError = (err) =>
  err?.response?.status === 409 &&
  /clientRef/i.test(String(err.response?.data?.error || ""));

// The request gave up before the server answered, so the save may still have landed
export const isTimeoutError = (err) =>
  err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT";

// A 4xx answer (validation error, bad request) means the server rejected the save, so it did not land
// and the pending clientRef can be dropped. A timeout, 5xx or network error may have landed, so keep it.
export const saveMayHaveLanded = (err) => {
  const status = err?.response?.status;
  return !(status >= 400 && status < 500);
};
