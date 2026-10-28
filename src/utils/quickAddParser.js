/**
 * Quick-add natural language parser (Phase L)
 *
 * Supported patterns:
 * - "23.40 lunch visa" -> amount: 23.40, name: "Lunch", card: Visa, category: "Food & Drink", date: today, is_paid: true
 * - "120 hydro due 11/05" -> amount: 120, name: "Hydro", category: "Essentials", date: "2026-11-05", is_paid: false
 * - "120 hydro due fri" -> the next Friday after today, is_paid: false
 * - "+2100 paycheque" -> type: "income", amount: 2100, name: "Paycheque", category: "Income"
 * - "$45 dinner checking" -> amount: 45, name: "Dinner", account: "Primary Checking"
 */

import { ALL_CATEGORIES, EXPENSE_CATEGORIES } from "../constants/categories.js";
import { getTorontoTodayStr, addDaysToDateStr } from "./dateUtils.js";

const CATEGORY_KEYWORDS = {
  "Food & Drink": [
    "lunch",
    "dinner",
    "breakfast",
    "coffee",
    "groceries",
    "grocery",
    "cafe",
    "burger",
    "pizza",
    "food",
    "drinks",
    "beer",
    "starbucks",
    "tim",
    "restaurant",
    "snack",
    "bakery",
  ],
  Essentials: [
    "hydro",
    "internet",
    "rent",
    "utilities",
    "utility",
    "electric",
    "electricity",
    "water",
    "wifi",
    "bill",
    "heat",
    "gas bill",
    "insurance",
    "phone",
    "mobile",
  ],
  Subscription: [
    "netflix",
    "spotify",
    "apple",
    "youtube",
    "disney",
    "prime",
    "gym",
    "fitness",
    "subscription",
    "sub",
    "patreon",
  ],
  Transportation: [
    "uber",
    "lyft",
    "gas",
    "gasoline",
    "transit",
    "bus",
    "train",
    "presto",
    "parking",
    "flight",
    "taxi",
  ],
  Entertainment: [
    "movie",
    "cinema",
    "concert",
    "game",
    "steam",
    "theatre",
    "event",
    "tickets",
  ],
  Shopping: [
    "amazon",
    "clothes",
    "shoes",
    "electronics",
    "mall",
    "store",
    "clothing",
  ],
  Income: [
    "salary",
    "paycheque",
    "paycheck",
    "bonus",
    "freelance",
    "dividend",
    "refund",
    "deposit",
  ],
};

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar-day arithmetic on YYYY-MM-DD strings (noon UTC), so the device's time zone never matters
const dayNumber = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12) / DAY_MS;
};
const weekdayOf = (dateStr) => new Date(dayNumber(dateStr) * DAY_MS).getUTCDay();

/**
 * "today" for Quick Add is Toronto's day, like the rest of the app. today can be a YYYY-MM-DD string
 * or a moment in time (Date), which is turned into the Toronto day at that moment.
 */
const toTodayStr = (today) => {
  if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today;
  return getTorontoTodayStr(today instanceof Date ? today : new Date());
};

/** The words that make Quick Add pick this card: brand words (visa, amex...) and name words over 2 letters */
export const cardKeywords = (card) => {
  const cardLower = (card?.name || "").toLowerCase();
  // Check for prominent brand words
  const keywords = [];
  if (cardLower.includes("visa")) keywords.push("visa");
  if (cardLower.includes("mastercard") || cardLower.includes("mc")) {
    keywords.push("mastercard", "mc");
  }
  if (cardLower.includes("amex") || cardLower.includes("american express")) {
    keywords.push("amex", "cobalt");
  }
  // Also add whole card name tokens > 2 chars
  cardLower.split(/\s+/).forEach((w) => {
    if (w.length > 2 && !keywords.includes(w)) keywords.push(w);
  });
  return keywords;
};

/** Words that make Quick Add pay from Primary Checking */
export const CHECKING_WORDS = /^(checking|chequing|debit|bank)$/i;

export const parseQuickAdd = (input = "", creditCards = [], today = new Date()) => {
  const todayStr = toTodayStr(today);
  let text = input.trim();
  if (!text) {
    return {
      type: "expense",
      name: "",
      amount: null,
      category: "Other",
      creditCardId: null,
      accountName: "Primary Checking",
      accountMentioned: false,
      date: todayStr,
      dateKey: "today",
      is_paid: true,
      recurrence: "none",
      rawInput: input,
      isValid: false,
    };
  }

  // 1. Determine Income vs Expense
  let type = "expense";
  if (text.startsWith("+")) {
    type = "income";
    text = text.slice(1).trim();
  } else if (/^(paycheque|paycheck|salary|bonus)\b/i.test(text)) {
    type = "income";
  }

  // 2. Extract Amount
  let amount = null;
  const amountMatch = text.match(/(?:^|\s)\$?(\d+(?:\.\d{1,2})?)(?:\s|$)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
    // Replace the matched amount in text
    text = text.replace(amountMatch[0], " ").trim();
  }

  // 3. Extract Due Date / Payment Date
  let date = todayStr;
  let is_paid = true;
  let dateMatched = false;
  // Stable label for the date as typed: "today"/"tomorrow"/weekdays stay relative, typed dates are absolute
  let dateKey = "today";

  // Patterns: "due YYYY-MM-DD", "due MM/DD", "due MM-DD", "due tomorrow", "due today", "on MM/DD"
  const dueFullMatch = text.match(/\b(?:due|on)\s+(\d{4}-\d{2}-\d{2})\b/i);
  const dueShortMatch = text.match(/\b(?:due|on)\s+(\d{1,2})[/-](\d{1,2})\b/i);
  const dueTomorrowMatch = text.match(/\b(?:due|on)\s+tomorrow\b/i);
  const dueTodayMatch = text.match(/\b(?:due|on)\s+today\b/i);
  // "due fri" / "on friday": the next such weekday after today (a weekday that is today means next week)
  const dueWeekdayMatch = text.match(
    /\b(?:due|on)\s+(sun|mon|tue|wed|thu|fri|sat)(?:day|s|sday|nesday|rsday|urday|r|rs)?\b/i
  );

  if (dueFullMatch) {
    date = dueFullMatch[1];
    is_paid = date <= todayStr;
    dateMatched = true;
    dateKey = date;
    text = text.replace(dueFullMatch[0], " ").trim();
  } else if (dueShortMatch) {
    let year = Number(todayStr.slice(0, 4));
    const month = String(parseInt(dueShortMatch[1], 10)).padStart(2, "0");
    const day = String(parseInt(dueShortMatch[2], 10)).padStart(2, "0");
    // If the candidate date is more than 60 days in the past (e.g. due 1/05 in December), use next year
    if (dayNumber(todayStr) - dayNumber(`${year}-${month}-${day}`) > 60) {
      year += 1;
    }
    date = `${year}-${month}-${day}`;
    is_paid = date <= todayStr;
    dateMatched = true;
    dateKey = date;
    text = text.replace(dueShortMatch[0], " ").trim();
  } else if (dueTomorrowMatch) {
    date = addDaysToDateStr(todayStr, 1);
    is_paid = false;
    dateMatched = true;
    dateKey = "tomorrow";
    text = text.replace(dueTomorrowMatch[0], " ").trim();
  } else if (dueWeekdayMatch) {
    const target = WEEKDAYS.indexOf(dueWeekdayMatch[1].toLowerCase());
    const ahead = ((target - weekdayOf(todayStr) + 7) % 7) || 7;
    date = addDaysToDateStr(todayStr, ahead);
    is_paid = false;
    dateMatched = true;
    // Keyed by the weekday, so "due fri" retried just after midnight on Friday is still the same save
    dateKey = `due ${WEEKDAYS[target]}`;
    text = text.replace(dueWeekdayMatch[0], " ").trim();
  } else if (dueTodayMatch) {
    date = todayStr;
    is_paid = true;
    dateMatched = true;
    dateKey = "today";
    text = text.replace(dueTodayMatch[0], " ").trim();
  }

  // If word "due" alone without date was specified, flag unpaid
  if (!dateMatched && /\bdue\b/i.test(text)) {
    is_paid = false;
    text = text.replace(/\bdue\b/i, " ").trim();
  }

  // 4. Fuzzy Match Paying Account
  let creditCardId = null;
  let accountName = "Primary Checking";
  // Whether the text named an account (checking or a card); rules may only pick one when it didn't
  let accountMentioned = false;

  // An account word counts only as a whole space-separated token: "VISA-Shop" or "visa.ca" stay in the
  // name. When several tokens name an account, the last one wins and only that token is removed.
  const tokens = text.split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i].toLowerCase();
    if (CHECKING_WORDS.test(token)) {
      accountMentioned = true;
      tokens.splice(i, 1);
      break;
    }
    const card =
      type !== "income" ? creditCards.find((c) => cardKeywords(c).includes(token)) : null;
    if (card) {
      creditCardId = card.id;
      accountName = card.name;
      accountMentioned = true;
      tokens.splice(i, 1);
      break;
    }
  }
  if (accountMentioned) text = tokens.join(" ");

  // 5. Categorize based on keywords
  const textLower = text.toLowerCase();
  let detectedCategory = type === "income" ? "Income" : "Other";

  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(textLower))) {
      detectedCategory = cat;
      break;
    }
  }

  // 6. Title / Name Clean up
  // Remove multiple whitespace
  let cleanName = text.replace(/\s+/g, " ").trim();
  if (cleanName) {
    // Capitalize first letter
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  } else {
    cleanName = detectedCategory !== "Other" ? detectedCategory : type === "income" ? "Income" : "Expense";
  }

  const isValid = amount !== null && amount > 0 && cleanName.length > 0;

  // Default applyToBalance: true for card charges dated today or 1-2 days ago (Phase D default)
  let applyToBalance = false;
  if (creditCardId && type === "expense") {
    const diffDays = dayNumber(todayStr) - dayNumber(date);
    applyToBalance = diffDays >= 0 && diffDays <= 2;
  }

  return {
    type,
    name: cleanName,
    amount,
    category: detectedCategory,
    creditCardId,
    accountMentioned,
    accountName,
    date,
    dateKey,
    is_paid,
    applyToBalance,
    recurrence: "none",
    rawInput: input,
    isValid,
  };
};

export default parseQuickAdd;
