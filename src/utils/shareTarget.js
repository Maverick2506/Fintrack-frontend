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
  "(?=\\s+(?:with|using|on|from|via|for|was|has|is|in\\s+the\\s+amount|approved|declined)\\b|\\s*[.,;!(]\\s|\\s*[.;!]?$|\\s*\\n)";
const PAYEE_PATTERNS = [
  new RegExp(`\\bmerchant\\s*[:-]\\s*(.+?)${PAYEE_END}`, "i"),
  // "at 9:14 AM" is a time, not a payee, so that "at" is skipped
  new RegExp(`\\b(?:at|@)\\s+(?!\\d{1,2}:\\d{2})(.+?)${PAYEE_END}`, "i"),
  new RegExp(`\\bby\\s+(.+?)${PAYEE_END}`, "i"),
  new RegExp(`\\b(?:to|from)\\s+(?!your\\b|the\\b|my\\b)(.+?)${PAYEE_END}`, "i"),
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
export const findSharedCard = (text, cards = []) => {
  const last4 = (text.match(LAST4) || [])[1];
  if (last4) {
    const byDigits = cards.find((c) => new RegExp(`(?<!\\d)${last4}(?!\\d)`).test(c.name || ""));
    if (byDigits) return byDigits;
  }
  const words = new Set(wordsOf(text));
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

const INCOME_WORDS = /\b(?:you\s+received|deposit(?:ed)?\s+(?:of|to)|direct\s+deposit|payroll\s+deposit|has\s+been\s+deposited)\b/i;
const DEBIT_WORDS = /\b(?:debit\s+(?:card|purchase)|interac|chequing|checking)\b/i;
// Money coming back isn't spending; Quick Add can't record a refund, so these aren't filled in
const REFUND_WORDS = /\b(?:refund(?:ed)?|credit(?:ed)?\s+to\s+your|reversal|returned)\b/i;
// A payment to a card or loan is a transfer, not spending ("A payment of $500 was applied to your
// Mastercard"), so it isn't filled in either; pay the card from Credit Cards instead
const CARD_PAYMENT_WORDS =
  /\bpayment\b(?:[^.]|\.\d)*?\b(?:applied|received|posted|credited)\b|\bpayment\b(?:[^.]|\.\d)*?\bto\s+your\s+(?:[\w-]+\s+){0,3}(?:card|visa|mastercard|amex|account|loan|line\s+of\s+credit)\b/i;

/**
 * A shared notification as a Quick Add line, or null when it doesn't look like one
 * (no dollar amount, a refund, or a card payment). Returns { line, amount, payee, card, income, cardUnsure, last4 }.
 * cardUnsure: the alert gave last 4 digits that no card's name holds.
 */
export const shareTextToQuickAdd = (sharedText, cards = []) => {
  const text = String(sharedText || "").slice(0, MAX_SHARED_LENGTH).replace(/[\u00a0\t]/g, " ").trim();
  if (!text || REFUND_WORDS.test(text) || CARD_PAYMENT_WORDS.test(text)) return null;
  const amount = parseAmount(text);
  if (!amount) return null;
  const income = INCOME_WORDS.test(text);
  const payee = findPayee(text) || (income ? "Deposit" : "");
  if (!payee) return null;

  const card = income || DEBIT_WORDS.test(text) ? null : findSharedCard(text, cards);
  const cardWord = card ? cardWordFor(card, cards) : null;
  // A payee word that names an account would steal the account pick, so say checking when it isn't a card
  const payeeNamesAccount = wordsOf(payee).some((w) => CHECKING_WORDS.test(w) || cards.some((c) => cardKeywords(c).includes(w)));
  const accountWord = cardWord || (!income && payeeNamesAccount ? "debit" : "");
  const amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const line = [`${income ? "+" : ""}${amountText}`, payee, accountWord].filter(Boolean).join(" ");
  // Last 4 digits that no card name holds: the card was guessed from its name (or not found), so say so
  const last4 = (text.match(LAST4) || [])[1] || null;
  const cardUnsure = Boolean(!income && last4 && !(card && new RegExp(`(?<!\\d)${last4}(?!\\d)`).test(card.name || "")));
  return { line, amount, payee, card: card ? { id: card.id, name: card.name } : null, income, last4: cardUnsure ? last4 : null, cardUnsure };
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
