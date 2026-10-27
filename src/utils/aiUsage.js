// Daily AI limit helpers (AI8): the usage line in Ask FinTrack and quiet category suggestions

/** True when the server refused an AI request because today's limit is reached */
export const isAiCapError = (error) => error?.response?.status === 429;

/** "Today: 7 of 100 AI requests · 8,421 tokens", or null when the numbers didn't come back */
export const formatAiUsage = (usage, formatNumber) => {
  if (!Number.isFinite(usage?.calls) || !Number.isFinite(usage?.cap)) return null;
  const tokens = Number.isFinite(usage.totalTokens) ? usage.totalTokens : 0;
  return `Today: ${usage.calls} of ${usage.cap} AI requests · ${formatNumber(tokens, {
    maximumFractionDigits: 0,
  })} tokens`;
};

export const MAX_AI_DAILY_CAP = 10000;

/** A whole number from 0 to 10,000 typed for the daily limit, or null */
export const parseAiCapInput = (text) => {
  const trimmed = String(text ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const cap = Number(trimmed);
  return cap <= MAX_AI_DAILY_CAP ? cap : null;
};
