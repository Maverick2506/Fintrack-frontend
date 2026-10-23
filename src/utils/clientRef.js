// Picks the clientRef for a create request. Retrying the same entry (e.g. after a timeout during a
// Render cold start) reuses the earlier ref, so the server recognises a save that already landed
// instead of storing it twice. A changed entry gets a fresh ref.
export const nextClientRef = (pending, key, makeId = () => crypto.randomUUID()) =>
  pending && pending.key === key ? pending : { key, clientRef: makeId() };

// A retry that races the original request (both delivered together after a cold start) can lose on
// the unique clientRef index. The server answers 409, but the entry is saved, so treat it as success.
export const isDuplicateClientRefError = (err) =>
  err?.response?.status === 409 &&
  /clientRef/i.test(String(err.response?.data?.error || ""));

// The request gave up before the server answered, so the save may still have landed
export const isTimeoutError = (err) =>
  err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT";
