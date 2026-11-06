import { EXPENSE_CATEGORIES } from "../constants/categories.js";
import { formatCurrency, formatShortDate } from "./formatUtils.js";
import { cardKeywords, CHECKING_WORDS } from "./quickAddParser.js";

/**
 * Receipt photos (AI5): POST /categorize-receipt reads a photo and answers a draft
 * { amount, merchant, date, taxAmount, category, categorySource, accountId, saved: false }.
 * Nothing is saved; these helpers fill Add Transaction or Quick Add from it, and the user saves.
 */

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Why a picked file can't be sent, or null when it can */
export const receiptFileProblem = (file) => {
  if (!file) return "Pick a photo of the receipt.";
  const type = String(file.type || "").toLowerCase();
  // Some phones leave the type blank for HEIC photos; the server checks the bytes anyway
  const heicByName = !type && /\.(heic|heif)$/i.test(file.name || "");
  if (!RECEIPT_TYPES.includes(type) && !heicByName) return "That isn't a photo. Use a JPEG, PNG, WebP or HEIC image.";
  if (file.size > RECEIPT_MAX_BYTES) return "The photo is over 5 MB. Take it again or pick a smaller one.";
  return null;
};

// The merchant as Quick Add text: words only, so the parser can't read a store number as the amount,
// a word like "due" or "on" as a date, or a card's name ("Visa Gift Shop") or "bank" as how it was paid
const QUICK_ADD_RESERVED = /^(due|on|today|tomorrow|paid|unpaid)$/i;
export const merchantForQuickAdd = (merchant, cards = []) => {
  const cardWords = new Set((cards || []).flatMap(cardKeywords));
  return String(merchant || "")
    .replace(/[^\p{L}\p{N}&'.\- ]+/gu, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        !/^[\d.\-#]+$/.test(word) &&
        !QUICK_ADD_RESERVED.test(word) &&
        !CHECKING_WORDS.test(word) &&
        !cardWords.has(word.toLowerCase())
    )
    .join(" ")
    .slice(0, 60)
    .trim();
};

/** Quick Add text from a draft: "23.46 Corner Store", with " on 2026-10-25" when it isn't today. cards are the
 * ones Quick Add matches, so a store named after a card doesn't charge that card. */
export const receiptDraftToQuickAddText = (draft, todayStr, cards = []) => {
  const name = merchantForQuickAdd(draft?.merchant, cards) || "Receipt";
  const amount = Number(draft?.amount) > 0 ? Number(draft.amount).toFixed(2) : "";
  const date = draft?.date && draft.date !== todayStr && draft.date < todayStr ? ` on ${draft.date}` : "";
  return `${amount ? `${amount} ` : ""}${name}${date}`;
};

/** The draft's category when the app knows it, else null (the form keeps its own) */
export const receiptCategory = (draft) =>
  draft?.category && draft.category !== "Other" && EXPENSE_CATEGORIES.includes(draft.category) ? draft.category : null;

/** Add Transaction fields from a draft; a missing date is today, a missing amount stays empty */
export const receiptFormFields = (draft, todayStr) => ({
  name: String(draft?.merchant || "").slice(0, 100),
  amount: Number(draft?.amount) > 0 ? String(Number(draft.amount).toFixed(2)) : "",
  date: draft?.date && draft.date <= todayStr ? draft.date : todayStr,
  category: receiptCategory(draft),
});

/** One line under the form: "From your receipt: Corner Store · $23.46 incl. $2.70 tax · Oct 25" */
export const receiptDraftSummary = (draft) => {
  const parts = [];
  if (draft?.merchant) parts.push(draft.merchant);
  if (Number(draft?.amount) > 0) {
    const tax = Number(draft.taxAmount) > 0 ? ` incl. ${formatCurrency(draft.taxAmount)} tax` : "";
    parts.push(`${formatCurrency(draft.amount)}${tax}`);
  }
  if (draft?.date) parts.push(formatShortDate(draft.date));
  return parts.length ? `From your receipt: ${parts.join(" · ")}` : "From your receipt";
};

/** What's missing, so the user knows to fill it in */
export const receiptDraftGaps = (draft) => {
  const gaps = [];
  if (!(Number(draft?.amount) > 0)) gaps.push("total");
  if (!draft?.merchant) gaps.push("store");
  if (!draft?.date) gaps.push("date");
  return gaps;
};
