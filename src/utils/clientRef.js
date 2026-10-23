// Picks the clientRef for a create request. Retrying the same entry (e.g. after a timeout during a
// Render cold start) reuses the earlier ref, so the server recognises a save that already landed
// instead of storing it twice. A changed entry gets a fresh ref.
export const nextClientRef = (pending, key, makeId = () => crypto.randomUUID()) =>
  pending && pending.key === key ? pending : { key, clientRef: makeId() };
