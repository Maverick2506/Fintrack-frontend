/**
 * Quick-add natural language parser (Phase L)
 *
 * Supported patterns:
 * - "23.40 lunch visa" -> amount: 23.40, name: "Lunch", card: Visa, category: "Food & Drink", date: today, is_paid: true
 * - "120 hydro due 11/05" -> amount: 120, name: "Hydro", category: "Essentials", date: "2026-11-05", is_paid: false
 * - "+2100 paycheque" -> type: "income", amount: 2100, name: "Paycheque", category: "Income"
 * - "$45 dinner checking" -> amount: 45, name: "Dinner", account: "Primary Checking"
 */

import { ALL_CATEGORIES, EXPENSE_CATEGORIES } from "../constants/categories.js";

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

const formatDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseQuickAdd = (input = "", creditCards = [], baseDate = new Date()) => {
  let text = input.trim();
  if (!text) {
    return {
      type: "expense",
      name: "",
      amount: null,
      category: "Other",
      creditCardId: null,
      accountName: "Primary Checking",
      date: formatDateStr(baseDate),
      dateExplicit: false,
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
  let date = formatDateStr(baseDate);
  let is_paid = true;
  let dateMatched = false;

  // Patterns: "due YYYY-MM-DD", "due MM/DD", "due MM-DD", "due tomorrow", "due today", "on MM/DD"
  const dueFullMatch = text.match(/\b(?:due|on)\s+(\d{4}-\d{2}-\d{2})\b/i);
  const dueShortMatch = text.match(/\b(?:due|on)\s+(\d{1,2})[/-](\d{1,2})\b/i);
  const dueTomorrowMatch = text.match(/\b(?:due|on)\s+tomorrow\b/i);
  const dueTodayMatch = text.match(/\b(?:due|on)\s+today\b/i);

  if (dueFullMatch) {
    date = dueFullMatch[1];
    is_paid = date <= formatDateStr(baseDate);
    dateMatched = true;
    text = text.replace(dueFullMatch[0], " ").trim();
  } else if (dueShortMatch) {
    let year = baseDate.getFullYear();
    const monthNum = parseInt(dueShortMatch[1], 10);
    const dayNum = parseInt(dueShortMatch[2], 10);
    // If the candidate date is more than 60 days in the past (e.g. due 1/05 in December), use next year
    const candidateDate = new Date(year, monthNum - 1, dayNum);
    const diffMs = baseDate.getTime() - candidateDate.getTime();
    if (diffMs > 60 * 24 * 60 * 60 * 1000) {
      year += 1;
    }
    const month = String(monthNum).padStart(2, "0");
    const day = String(dayNum).padStart(2, "0");
    date = `${year}-${month}-${day}`;
    is_paid = date <= formatDateStr(baseDate);
    dateMatched = true;
    text = text.replace(dueShortMatch[0], " ").trim();
  } else if (dueTomorrowMatch) {
    const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    date = formatDateStr(tomorrow);
    is_paid = false;
    dateMatched = true;
    text = text.replace(dueTomorrowMatch[0], " ").trim();
  } else if (dueTodayMatch) {
    date = formatDateStr(baseDate);
    is_paid = true;
    dateMatched = true;
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

  if (/\b(checking|chequing|debit|bank)\b/i.test(text)) {
    accountName = "Primary Checking";
    creditCardId = null;
    text = text.replace(/\b(checking|chequing|debit|bank)\b/i, " ").trim();
  } else if (creditCards.length > 0 && type !== "income") {
    for (const card of creditCards) {
      const cardLower = (card.name || "").toLowerCase();
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

      let found = false;
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(text)) {
          creditCardId = card.id;
          accountName = card.name;
          text = text.replace(regex, " ").trim();
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

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
    const candidate = new Date(date + "T12:00:00Z");
    const todayZoned = new Date(formatDateStr(baseDate) + "T12:00:00Z");
    const diffDays = Math.round((todayZoned - candidate) / (1000 * 60 * 60 * 24));
    applyToBalance = diffDays >= 0 && diffDays <= 2;
  }

  return {
    type,
    name: cleanName,
    amount,
    category: detectedCategory,
    creditCardId,
    accountName,
    date,
    dateExplicit: dateMatched,
    is_paid,
    applyToBalance,
    recurrence: "none",
    rawInput: input,
    isValid,
  };
};

export default parseQuickAdd;
