/**
 * Share -> FinTrack: turns a shared bank notification into one Quick Add line.
 * "You spent $23.40 at TIM HORTONS with your Visa ending 1234" -> "23.40 Tim Hortons visa"
 * Nothing is ever saved from a share; Quick Add only fills its input.
 */

import { cardKeywords, CHECKING_WORDS } from "./quickAddParser.js";
import { SHARE_TARGET } from "../constants/shareTarget.js";

const MAX_SHARED_LENGTH = 1000;
const MAX_PAYEE_LENGTH = 60;

// "$1,234.56", "$ 23.40", "CAD 23.40", "23.40 CAD", "23,40 $" (French Canadian)
const AMOUNT_PATTERNS = [
  { re: /(?:CA)?\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?!\d)/gi, decimalComma: false },
  { re: /\bCAD\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?!\d)/gi, decimalComma: false },
  { re: /(?<![\d.,])(\d{1,3}(?:[ \u00a0]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s?(?:\$|CAD\b)/gi, decimalComma: true },
];
// An amount right after these words is a balance or limit, not what was spent
const NOT_SPENT_BEFORE = /\b(?:balance|available|limit|remaining|owing|minimum)\b[^.$\d]{0,25}$/i;
// An amount right after these words is the purchase itself
const SPENT_BEFORE = /\b(?:spent|purchase|charged?|transaction|payment|sent|received|withdrawal|of|for)\b[^.$\d]{0,25}$/i;

// Every amount in the text, in order, with where it starts
const amountsIn = (text) => {
  const found = [];
  for (const { re, decimalComma } of AMOUNT_PATTERNS) {
    for (const m of text.matchAll(re)) {
      // "23,40 $" uses a decimal comma; "1,234.56" uses a thousands comma
      const digits = decimalComma ? m[1].replace(/[ \u00a0]/g, "").replace(",", ".") : m[1].replace(/,/g, "");
      const amount = parseFloat(digits);
      if (amount > 0 && !found.some((f) => f.index === m.index)) {
        found.push({ amount: Math.round(amount * 100) / 100, index: m.index });
      }
    }
  }
  return found.sort((a, b) => a.index - b.index);
};

// The amount spent: the first one after a spending word, else the first that isn't a balance or limit
const parseAmount = (text) => {
  const candidates = amountsIn(text).filter((a) => !NOT_SPENT_BEFORE.test(text.slice(0, a.index)));
  const spent = candidates.find((a) => SPENT_BEFORE.test(text.slice(0, a.index))) || candidates[0];
  return spent ? spent.amount : null;
};

// Words after the payee that end it: "at TIM HORTONS with your Visa", "at COSTCO on your card"
const PAYEE_END =
  "(?=\\s+(?:of\\s+)?(?:CA)?\\$\\s?\\d|\\s+(?:with|using|on|from|via|for|was|has|is|in\\s+the\\s+amount|approved|declined)\\b|\\s*[.,;!(]\\s|\\s*[.;!]?$|\\s*\\n)";
const PAYEE_PATTERNS = [
  new RegExp(`\\bmerchant\\s*[:-]\\s*(.+?)${PAYEE_END}`, "i"),
  // "at 9:14 AM" is a time, not a payee, so that "at" is skipped
  new RegExp(`\\b(?:at|@)\\s+(?!\\d{1,2}:\\d{2})(.+?)${PAYEE_END}`, "i"),
  new RegExp(`\\bby\\s+(.+?)${PAYEE_END}`, "i"),
  new RegExp(`\\b(?:to|from)\\s+(?!your\\b|the\\b|my\\b)(.+?)${PAYEE_END}`, "i"),
  // "Netflix $16.49 was charged to your Visa" (after an optional "TD Alert:" prefix)
  /^(?:[\w&' .-]{0,30}?:\s*)?(.+?)\s+(?:CA)?\$\s?[\d,]+(?:\.\d{1,2})?\s+(?:was\s+|has\s+been\s+)?(?:charged|authori[sz]ed|spent)\b/i,
];

// Store numbers, phone numbers, dates and reference numbers come off, like the server's displayPayeeTitle
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const cleanPayee = (raw) => {
  const cleaned = String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/\(?\b\d{3}\)?[-. ]?\d{3}[-. ]\d{4}\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?(?![\w])/gi, " ")
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ")
    .replace(new RegExp(`\\b(?:${MONTHS})[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, "gi"), " ")
    .replace(/#\s*[\w-]*/g, " ")
    .replace(/\b(?:no\.|ref)\s*[#:.]?\s*[\w-]*\d[\w-]*/gi, " ")
    .replace(/(?<![\w-])\d{3,}(?![\w-])/g, " ")
    // Payment-network prefixes on card statements: "SQ *CAFE", "TST* BAKERY", "PAYPAL *SPOTIFY"
    .replace(/^(?:sq|tst|pp|paypal|sp)\s*\*\s*/i, "")
    .replace(/\*/g, " ")
    .split(/\s+/)
    .filter((t) => t && (t === "&" || /[\p{L}\d]/u.test(t)))
    .join(" ")
    .replace(/^[\s&'.,*:/-]+|[\s&',*:/-]+$/g, "");
  // Shouted merchant names read better in title case: "TIM HORTONS" -> "Tim Hortons"
  const titled = /[a-z]/.test(cleaned)
    ? cleaned
    : cleaned.toLowerCase().replace(/(^|[\s&/-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
  return titled.slice(0, MAX_PAYEE_LENGTH).trim();
};

// A payee that is really an account ("your Visa", "your account") isn't a payee
const isAccountWords = (payee) => /^(?:your|my|the)\b/i.test(payee) || /\b(?:card|account)\s*$/i.test(payee);

const findPayee = (text) => {
  for (const re of PAYEE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const payee = cleanPayee(m[1]);
    if (payee && !isAccountWords(payee) && /\p{L}/u.test(payee)) return payee;
  }
  return "";
};

// "ending 1234", "ending in 1234", "*1234", "****1234", "x1234", "last 4: 1234"
const LAST4 = /(?:ending(?:\s+in)?|last\s*(?:4|four)(?:\s*digits)?\s*[:-]?|\*+|\bx{1,4})\s*(\d{4})\b/i;

const wordsOf = (text) => String(text || "").toLowerCase().split(/[^\p{L}\d]+/u).filter(Boolean);

// The card a notification names: by its last 4 digits (when a card's name has them), else by name words
export const findSharedCard = (text, cards = [], payee = "") => {
  const last4 = (text.match(LAST4) || [])[1];
  if (last4) {
    const byDigits = cards.find((c) => new RegExp(`(?<!\\d)${last4}(?!\\d)`).test(c.name || ""));
    if (byDigits) return byDigits;
  }
  // Words of the payee don't pick a card: "ROGERS WIRELESS" isn't "Rogers Mastercard"
  const payeeWords = new Set(wordsOf(payee));
  const words = new Set(wordsOf(text).filter((w) => !payeeWords.has(w)));
  let best = null;
  let bestScore = 0;
  for (const card of cards) {
    const score = cardKeywords(card).filter((k) => words.has(k)).length;
    if (score > bestScore) {
      best = card;
      bestScore = score;
    }
  }
  return best;
};

// The word to end the Quick Add line with so parseQuickAdd picks this card (it takes the first card
// with that keyword, so use one that no earlier card has)
export const cardWordFor = (card, cards = []) =>
  cardKeywords(card).find((k) => cards.find((c) => cardKeywords(c).includes(k)) === card) || null;

// An Interac e-Transfer coming in: received or deposited (not "you sent")
const E_TRANSFER_IN =
  /\b(?:received|deposited|accepted)\b(?:[^.]|\.\d)*?\be-?transfer\b|\be-?transfer\b(?:[^.]|\.\d)*?\b(?:received|deposited|accepted)\b/i;
const INCOME_WORDS = /\b(?:you\s+received|deposit(?:ed)?\s+(?:of|to)|direct\s+deposit|payroll\s+deposit|has\s+been\s+deposited)\b/i;
// Debit wording means Primary Checking, even when its last 4 digits look like a card's
const DEBIT_WORDS = /\b(?:debit|interac|chequing|checking)\b/i;
// Money coming back isn't spending; Quick Add can't record a refund, so these aren't filled in
const REFUND_WORDS = /\b(?:refund(?:ed)?|credit(?:ed)?\s+to\s+your|reversal|returned)\b/i;
// Purchase words win over anything that looks like a card payment: "charged to your Visa" is spending
const PURCHASE_WORDS = /\b(?:charged|purchase[ds]?|spent|authori[sz]ed)\b/i;
// "of $500.00" between "payment" and the rest
const AMT = String.raw`(?:of\s+)?(?:(?:CA)?\$\s?[\d,]+(?:\.\d{1,2})?|CAD\s?[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s?\$)\s+`;
const GAP = String.raw`(?:[^.]|\.\d){0,60}?`;
// A payment to a credit card is a transfer, not spending. Only payment-to-card phrasing counts.
const CARD_PAYMENT_PATTERNS = [
  /\bthank\s+you\s+for\s+your\s+payment\b/i,
  new RegExp(String.raw`\bpayment\s+(?:${AMT})?(?:has\s+been\s+|was\s+)?received\b`, "i"),
  new RegExp(String.raw`\bpayment\b${GAP}\b(?:applied|posted)\s+(?:to|on)\s+your\b`, "i"),
  new RegExp(String.raw`\bpayment\s+(?:${AMT})?to\s+your\s+(?:[\w-]+\s+){0,3}?(?:card|visa|mastercard|amex|credit\s+card)\b`, "i"),
];
// "payment to TD Visa": a payment to one of your cards by name
const PAYMENT_TO = new RegExp(String.raw`\bpayment\s+(?:${AMT})?to\s+((?:(?!(?:on|with|was|has|is|using|from|at)\b)[\w-]+\s*){1,4})`, "i");
// "Bill payment to HYDRO ONE $88.10 posted": paid from Checking to that payee
const BILL_PAYMENT = new RegExp(
  String.raw`\bbill\s+payment\s+(?:${AMT})?to\s+(.+?)(?=\s+(?:CA)?\$|\s+\d|\s+(?:of|for|in\s+the\s+amount|was|has|is|posted|on|from)\b|\s*[.,;!]|$)`,
  "i"
);
const CREDIT_CARD_WORDS = /\b(?:visa|mastercard|amex|american\s+express|credit\s+card)\b/i;

const isCardPayment = (text, cards) => {
  if (PURCHASE_WORDS.test(text) || /\bbill\s+payment\b/i.test(text)) return false;
  // Money in by e-Transfer ("Payment received: $75.00 from JOHN SMITH via Interac e-Transfer") isn't a
  // card payment, unless the alert names a credit card
  if (E_TRANSFER_IN.test(text) && !CREDIT_CARD_WORDS.test(text)) return false;
  if (CARD_PAYMENT_PATTERNS.some((re) => re.test(text))) return true;
  // "payment to <card>": a brand word or one of your cards' last 4 digits. A shared name word alone
  // isn't enough ("payment to ROGERS WIRELESS" isn't a payment to "Rogers Mastercard 4821").
  const to = text.match(PAYMENT_TO);
  if (!to) return false;
  if (CREDIT_CARD_WORDS.test(to[1])) return true;
  const digits = to[1].match(/(?<!\d)\d{4}(?!\d)/g) || [];
  return digits.some((d) => cards.some((c) => new RegExp(`(?<!\\d)${d}(?!\\d)`).test(c.name || "")));
};

const amountText = (amount) => (Number.isInteger(amount) ? String(amount) : amount.toFixed(2));
const cardRef = (card) => (card ? { id: card.id, name: card.name } : null);

/**
 * A shared notification for Quick Add, or null when it doesn't look like one (no dollar amount, or a
 * refund). Returns { kind, line, amount, payee, card, income, billPayment, cardUnsure, last4 }:
 * - kind "expense" / "income": line is the Quick Add text to fill in.
 * - kind "cardPayment": a payment to a credit card. line is null; Quick Add points to Credit Cards → Pay.
 * - billPayment: "Bill payment to <payee>", from Checking (Quick Add offers to mark a matching bill paid).
 * - cardUnsure: a credit card was named (by last 4 or brand) that matches none of the cards; last4 when given.
 */
export const shareTextToQuickAdd = (sharedText, cards = []) => {
  const text = String(sharedText || "").slice(0, MAX_SHARED_LENGTH).replace(/[\u00a0\t]/g, " ").trim();
  if (!text || REFUND_WORDS.test(text)) return null;
  const amount = parseAmount(text);
  if (!amount) return null;
  const last4Given = (text.match(LAST4) || [])[1] || null;

  if (isCardPayment(text, cards)) {
    const card = findSharedCard(text, cards);
    return { kind: "cardPayment", line: null, amount, payee: "", card: cardRef(card), income: false, billPayment: false, cardUnsure: false, last4: null };
  }

  const billMatch = text.match(BILL_PAYMENT);
  const billPayee = billMatch ? cleanPayee(billMatch[1]) : "";
  const billPayment = Boolean(billPayee);
  const income = !billPayment && (INCOME_WORDS.test(text) || E_TRANSFER_IN.test(text));
  const payee = billPayee || findPayee(text) || (income ? "Deposit" : "");
  if (!payee) return null;

  const debit = billPayment || DEBIT_WORDS.test(text);
  const card = income || debit ? null : findSharedCard(text, cards, payee);
  const cardWord = card ? cardWordFor(card, cards) : null;
  // A payee word that names an account would steal the account pick, so say checking when it isn't a card
  const payeeNamesAccount = wordsOf(payee).some((w) => CHECKING_WORDS.test(w) || cards.some((c) => cardKeywords(c).includes(w)));
  const accountWord = cardWord || (!income && payeeNamesAccount ? "debit" : "");
  const line = [`${income ? "+" : ""}${amountText(amount)}`, payee, accountWord].filter(Boolean).join(" ");

  // "Check the card" only when a credit card is named that matches none of yours: its last 4 digits
  // are in no card's name, or its brand is on no card. Debit and income never ask.
  const holdsLast4 = (c) => c && new RegExp(`(?<!\\d)${last4Given}(?!\\d)`).test(c.name || "");
  const unknownLast4 = Boolean(last4Given && !holdsLast4(card));
  const unknownBrand = !card && CREDIT_CARD_WORDS.test(text);
  const cardUnsure = !income && !debit && (unknownLast4 || unknownBrand);
  return {
    kind: income ? "income" : "expense",
    line,
    amount,
    payee,
    card: cardRef(card),
    income,
    billPayment,
    cardUnsure,
    last4: cardUnsure && unknownLast4 ? last4Given : null,
  };
};

const significantWords = (text) => wordsOf(text).filter((w) => w.length > 2 && !/^\d+$/.test(w));

/**
 * The unpaid bill a bill-payment alert paid: same amount (to the cent) and a payee that shares a word
 * with the bill's name ("Hydro One" pays "Hydro"). rows are Ledger rows (GET /expenses/all). null if none.
 */
export const findMatchingBill = (rows = [], payee, amount) => {
  const payeeWords = new Set(significantWords(payee));
  return (
    rows.find(
      (r) =>
        r &&
        r.type === "expense" &&
        !r.is_paid &&
        Math.abs((parseFloat(r.amount) || 0) - amount) < 0.005 &&
        significantWords(r.name).some((w) => payeeWords.has(w))
    ) || null
  );
};

/** Credit Cards → Pay for a shared card payment: the card's Pay dialog with the amount filled in */
export const cardPaymentLink = (shared, cards = []) => {
  const card = shared?.card || (cards.length === 1 ? cards[0] : null);
  const params = new URLSearchParams();
  if (card) params.set("pay", card.id);
  if (shared?.amount) params.set("amount", amountText(shared.amount));
  const qs = params.toString();
  return `/credit-cards${qs ? `?${qs}` : ""}`;
};

/**
 * What Quick Add opened with: a share (title and text joined) that reads as a notification gives
 * one line; otherwise null and the page treats ?text= as a Quick Add link (one entry per line).
 */
export const readSharedQuickAdd = (search, cards = []) => {
  const params = new URLSearchParams(search || "");
  const { text: textParam, title: titleParam } = SHARE_TARGET.params;
  const shared = [params.get(titleParam), params.get(textParam)].filter(Boolean).join(" \n");
  if (!shared) return null;
  return shareTextToQuickAdd(shared, cards);
};

// A share rather than a Quick Add link: it has a title (Gem links never do), or its text is only
// web addresses (sharing a page). One that isn't a bank alert fills nothing.
export const isShareParams = (search) => {
  const params = new URLSearchParams(search || "");
  if (params.get(SHARE_TARGET.params.title)) return true;
  const lines = String(params.get(SHARE_TARGET.params.text) || "")
    .split(/\s+/)
    .filter(Boolean);
  return lines.length > 0 && lines.every((w) => /^https?:\/\//i.test(w));
};

// The query string without the share's title (the text param is removed with the link's)
export const withoutShareParams = (search) => {
  const params = new URLSearchParams(search || "");
  params.delete(SHARE_TARGET.params.title);
  params.delete(SHARE_TARGET.params.text);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
};
