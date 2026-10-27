import { addDaysToDateStr } from "./dateUtils.js";

// Date formats the server can read (fintrack-backend utils/csvImport.js DATE_FORMATS)
export const IMPORT_DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "2026-09-30" },
  { value: "MM/DD/YYYY", label: "09/30/2026 (month first)" },
  { value: "DD/MM/YYYY", label: "30/09/2026 (day first)" },
  { value: "YYYY/MM/DD", label: "2026/09/30" },
  { value: "DD-MMM-YYYY", label: "30-Sep-2026" },
  { value: "MMM DD, YYYY", label: "Sep 30, 2026" },
];

/** "3 matched · 5 new · 2 skipped", leaving out zeros except new */
export const importCountsLine = (counts) => {
  if (!counts) return "";
  const parts = [];
  if (counts.matched) parts.push(`${counts.matched} matched`);
  parts.push(`${counts.new || 0} new`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  return parts.join(" · ");
};

/** True when the mapping names a date, a description and either an amount or both debit and credit */
export const isMappingComplete = (m) => {
  if (!m) return false;
  const set = (v) => Number.isInteger(v) && v >= 0;
  const amountOk = set(m.amount) || (set(m.debit) && set(m.credit));
  return set(m.date) && Array.isArray(m.description) && m.description.length > 0 && m.description.every(set) && amountOk && Boolean(m.dateFormat);
};

/**
 * What a preview row will do once imported, after the user's edits:
 * "skip" (duplicate or skipped), "match" (marks the bill paid) or "new".
 */
export const rowOutcome = (row, edit = {}) => {
  if (row.status === "duplicate" || edit.skip) return "skip";
  if (row.status === "match" && !edit.unmatch) return "match";
  return "new";
};

/**
 * What importing a row does to the account's balance (what's owed, on a card), after the user's
 * edits. Rows dated on or before the balance anchor are history and change nothing; so does a link to
 * a payment the other statement already recorded, unless it's unmatched and added as a new row.
 */
export const rowBalanceEffect = (row, edit = {}, accountType) => {
  const outcome = rowOutcome(row, edit);
  if (outcome === "skip" || row.history) return 0;
  if (outcome === "match") return row.balanceEffect || 0;
  const raises = accountType === "CHECKING" ? row.direction === "in" : row.direction === "out";
  return raises ? row.amount : -row.amount;
};

/** Counts after the user's edits, for the Import button and summary */
export const countOutcomes = (rows, edits = {}, accountType) => {
  const counts = { matched: 0, new: 0, skipped: 0, history: 0, balanceChanging: 0 };
  for (const row of rows || []) {
    const outcome = rowOutcome(row, edits[row.line]);
    if (outcome === "skip") counts.skipped++;
    else if (outcome === "match") counts.matched++;
    else counts.new++;
    if (outcome !== "skip" && row.history) counts.history++;
    if (rowBalanceEffect(row, edits[row.line], accountType) !== 0) counts.balanceChanging++;
  }
  return counts;
};

/** The account's balance once the rows the user keeps are imported, from the preview's balanceNow */
export const balanceAfterImport = (preview, edits = {}) => {
  if (!preview || typeof preview.balanceNow !== "number") return null;
  const type = preview.account?.type;
  const total = (preview.rows || []).reduce((sum, row) => sum + rowBalanceEffect(row, edits[row.line], type), 0);
  return Math.round((preview.balanceNow + total) * 100) / 100;
};

/** "2 rows are history (on or before Feb 28) · 5 change the balance" */
export const historyLine = (counts, anchorLabel) => {
  if (!counts) return "";
  const parts = [];
  if (counts.history) {
    parts.push(`${counts.history} ${counts.history === 1 ? "row is" : "rows are"} history${anchorLabel ? ` (on or before ${anchorLabel})` : ""}`);
  }
  parts.push(`${counts.balanceChanging} change${counts.balanceChanging === 1 ? "s" : ""} the balance`);
  return parts.join(" · ");
};

/** A refund is saved as negative spending: an expense with a negative amount */
export const isRefundRow = (row) => row?.type === "expense" && parseFloat(row.amount) < 0;

/**
 * The commit body's rows: every preview row in file order (the server re-checks each one), with the
 * user's edits. edits is keyed by line: { category, skip, unmatch }.
 */
export const buildCommitRows = (rows, edits = {}) =>
  (rows || []).map((row) => {
    const edit = edits[row.line] || {};
    const out = {
      date: row.date,
      description: row.description,
      amount: row.amount,
      direction: row.direction,
      occurrence: row.occurrence || 1,
      category: edit.category || row.category || null,
      skip: Boolean(edit.skip),
    };
    if (row.status === "match" && edit.unmatch) out.matchId = null;
    return out;
  });

/**
 * Same as the server's applyRules (services/ruleService.js): rules sorted lowest priority first; a
 * rule matches when the title contains its text, ignoring case; each field comes from the first
 * matching rule that sets it.
 */
export const applyRules = (rules, title) => {
  const t = String(title || "").toLowerCase();
  const sorted = [...(rules || [])].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  const result = { category: null, accountId: null };
  for (const rule of sorted) {
    const needle = String(rule.match || "").trim().toLowerCase();
    if (!needle || !t.includes(needle)) continue;
    if (!result.category && rule.category) result.category = rule.category;
    if (!result.accountId && rule.accountId) result.accountId = rule.accountId;
    if (result.category && result.accountId) break;
  }
  return result;
};

/**
 * Quick Add with rules: the user's own rule beats the built-in keyword category, and fills the card
 * when the text named no account. A rule's card charge dated today or 1-2 days ago counts toward the card's
 * balance, like a card typed in the text.
 */
export const applyRulesToQuickAdd = (parsed, rules, cards, todayStr) => {
  if (!parsed || parsed.type !== "expense" || !rules?.length) return parsed;
  const ruled = applyRules(rules, parsed.name);
  const next = { ...parsed };
  if (ruled.category) {
    next.category = ruled.category;
    next.ruleApplied = true;
  }
  const card = !parsed.accountMentioned && ruled.accountId ? (cards || []).find((c) => c.id === ruled.accountId) : null;
  if (card) {
    next.creditCardId = card.id;
    next.accountName = card.name;
    next.applyToBalance = parsed.date <= todayStr && parsed.date >= addDaysToDateStr(todayStr, -2);
    next.ruleApplied = true;
  }
  return next;
};

// Words that don't name a merchant: card-terminal noise in bank descriptions
const NOISE = new Set(["pos", "purchase", "payment", "debit", "credit", "interac", "visa", "mc", "the", "inc", "ltd", "com", "www", "ca"]);

/**
 * A starting point for "Make a rule from this": the first two merchant words of a bank description,
 * in lower case, without store numbers, reference codes or words under 3 letters (a rule for "td"
 * would also catch "LTD"). "TIM HORTONS #0001" -> "tim hortons".
 */
export const suggestRuleMatch = (title) => {
  const words = String(title || "")
    .toLowerCase()
    .replace(/[*#]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((w) => w.length >= 3 && /^[a-z][a-z'&.-]*$/.test(w));
  const merchant = words.filter((w) => !NOISE.has(w));
  // Only terminal words ("VISA PAYMENT"): keep them rather than the whole line with its numbers
  const picked = (merchant.length ? merchant : words).slice(0, 2).join(" ");
  return picked || String(title || "").trim().toLowerCase().slice(0, 40);
};

/** Label for a column choice: its name and the first value under it, e.g. "Description 1 · TIM HORTONS" */
export const columnOptionLabel = (columns, sampleRows, hasHeader, index) => {
  const name = columns?.[index] || `Column ${index + 1}`;
  const body = hasHeader ? (sampleRows || []).slice(1) : sampleRows || [];
  const example = body.map((r) => r?.[index]).find((v) => v);
  return example && example !== name ? `${name} · ${String(example).slice(0, 24)}` : name;
};
