// Ask FinTrack can be opened from any page; one chat panel lives in the app layout.

export const ASK_OPEN_EVENT = "fintrack:open-ask";
export const ASK_HISTORY_KEY = "fintrack_ask_history";
export const ASK_HISTORY_MAX = 50;

let isOpen = false;

/** Opens the Ask FinTrack panel from anywhere in the app. */
export const openAskFinTrack = () => {
  window.dispatchEvent(new Event(ASK_OPEN_EVENT));
};

export const setAskFinTrackOpen = (open) => {
  isOpen = open;
};

/** True while the panel is open, so page shortcuts can stay out of its way. */
export const isAskFinTrackOpen = () => isOpen;

const isMessage = (m) =>
  m && (m.role === "user" || m.role === "model") && typeof m.text === "string";

export const MAX_PROPOSALS = 5;

/**
 * Drafts from the proposeTransaction tool, shown as "Review & save" cards. Anything that isn't a
 * { quickAddText, summary } pair of strings is dropped (they come from the server or sessionStorage).
 */
export const cleanProposals = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((p) => p && typeof p.quickAddText === "string" && p.quickAddText.trim())
    .slice(0, MAX_PROPOSALS)
    .map((p) => ({
      quickAddText: p.quickAddText.trim().slice(0, 200),
      summary: typeof p.summary === "string" ? p.summary.slice(0, 300) : "",
    }));

const withCleanProposals = (m) => {
  const proposals = cleanProposals(m.proposals);
  const { proposals: _dropped, ...rest } = m;
  return proposals.length ? { ...rest, proposals } : rest;
};

/** The conversation kept for this tab, or [] when there is none or it cannot be read. */
export const loadAskHistory = (storage) => {
  try {
    const parsed = JSON.parse(storage?.getItem(ASK_HISTORY_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isMessage).slice(-ASK_HISTORY_MAX).map(withCleanProposals)
      : [];
  } catch {
    return [];
  }
};

/** Keeps the latest messages for this tab; an empty chat removes the entry. */
export const saveAskHistory = (storage, messages) => {
  try {
    if (!messages.length) storage?.removeItem(ASK_HISTORY_KEY);
    else storage?.setItem(ASK_HISTORY_KEY, JSON.stringify(messages.slice(-ASK_HISTORY_MAX)));
  } catch {
    // Storage full or blocked: the chat still works for this visit
  }
};
