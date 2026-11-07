import { EXPENSE_CATEGORIES } from "../constants/categories.js";

/**
 * Quick Add payee spelling. The server's GET /expenses/payees lists the payees you've used, keyed by
 * normalizePayeeTitle (Fintrack-backend utils/payeeNormalizer.js); payeeKey below is the same key,
 * so "TIM HORTONS", "tim hortons" and "Tim Hortons #4521" are one payee.
 */
const MONTH_WORDS =
  "january|february|march|april|may|june|july|august|september|october|november|december|" +
  "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const B = "(?<![\\p{L}\\d])";
const E = "(?![\\p{L}\\d])";
const ISO_DATE = new RegExp(`${B}\\d{4}-\\d{1,2}-\\d{1,2}${E}`, "gu");
const NUMERIC_DATE = new RegExp(`${B}\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?${E}`, "gu");
const MONTH_DATE = new RegExp(
  `${B}(?:${MONTH_WORDS})${E}\\.?(?:\\s+\\d{1,2}(?:st|nd|rd|th)?${E})?(?:,?\\s+\\d{4}${E})?`,
  "gu"
);
const HASH_REF = /#\s*[\p{L}\d-]*/gu;
const WORD_REF = new RegExp(`${B}(?:no\\.|ref)\\s*[#:.]?\\s*[\\p{L}\\d-]*\\d[\\p{L}\\d-]*`, "gu");
const LONG_NUMBER = new RegExp(`${B}\\d{3,}${E}`, "gu");

export const payeeKey = (rawTitle) => {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  const fallback = rawTitle.toLowerCase().replace(/\s+/g, " ").trim();
  const cleaned = fallback
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(ISO_DATE, " ")
    .replace(NUMERIC_DATE, " ")
    .replace(MONTH_DATE, " ")
    .replace(HASH_REF, " ")
    .replace(WORD_REF, " ")
    .replace(LONG_NUMBER, " ")
    .replace(/[^\p{L}\d\s&'.-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && (token === "&" || /[\p{L}\d]/u.test(token)))
    .join(" ")
    .replace(/^[\s&'.-]+|[\s&'.-]+$/g, "");
  return cleaned || fallback;
};

/**
 * Capitalizes each all-lowercase word: "tim hortons" -> "Tim Hortons". A word you already gave
 * capitals keeps them ("IKEA", "McDonald's", "eBay" stays as typed only if it has a capital).
 */
export const titleCaseWords = (text) =>
  String(text || "")
    .split(" ")
    .map((w) => (w && w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

/** The listed payee with the same key and type as this name, or null */
export const findPayee = (payees, name, type = "expense") => {
  const key = payeeKey(name);
  if (!key || !Array.isArray(payees)) return null;
  return payees.find((p) => p && p.key === key && (p.type || "expense") === type) || null;
};

/**
 * Quick Add's name and category after the payee list:
 * - a known payee: its spelling, and its usual category when neither a rule nor a keyword set one
 * - otherwise: each lowercase word title-cased
 * `typed` is the parser's own result (to tell a keyword category from the default); `parsed` is after rules.
 */
export const applyPayeeToQuickAdd = (parsed, typed, payees) => {
  if (!parsed || !parsed.name) return parsed;
  // The name is only a category stand-in when nothing but an amount was typed
  if (!typed?.rawInput || !String(typed.rawInput).replace(/[\d$.+\s]/g, "")) return parsed;
  const payee = findPayee(payees, parsed.name, parsed.type);
  if (!payee) return { ...parsed, name: titleCaseWords(parsed.name) };
  const next = { ...parsed, name: titleCaseWords(payee.name || parsed.name), payeeMatched: true };
  const keywordCategory = typed.category !== (typed.type === "income" ? "Income" : "Other");
  if (
    parsed.type === "expense" &&
    !parsed.ruleCategory &&
    !keywordCategory &&
    EXPENSE_CATEGORIES.includes(payee.category) &&
    payee.category !== "Other"
  ) {
    next.category = payee.category;
    next.payeeCategory = true;
  }
  return next;
};
