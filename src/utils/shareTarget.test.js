/* global process */
import {
  shareTextToQuickAdd,
  readSharedQuickAdd,
  findSharedCard,
  withoutShareParams,
  isShareParams,
  findMatchingBill,
  cardPaymentLink,
} from "./shareTarget.js";
import { parseQuickAddTextParam, restoreLinkList } from "./quickAddLink.js";
import { parseQuickAdd } from "./quickAddParser.js";
import { SHARE_TARGET } from "../constants/shareTarget.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   SHARE TO FINTRACK UNIT TESTS                   ");
console.log("==================================================");

const CARDS = [
  { id: "c1", name: "TD Visa 1234" },
  { id: "c2", name: "Amex Cobalt" },
  { id: "c3", name: "Rogers Mastercard 4821" },
  { id: "c4", name: "Scotia Visa 9876" },
];
const TODAY = "2026-10-28";

// Five made-up notifications in the style of Canadian banks, and what Quick Add should get
const SAMPLES = [
  {
    text: "You spent $23.40 at TIM HORTONS with your Visa ending 1234",
    line: "23.40 Tim Hortons visa",
    name: "Tim Hortons",
    amount: 23.4,
    card: "c1",
    category: "Food & Drink",
  },
  {
    text: "RBC Alert: A purchase of $1,054.12 was made at COSTCO WHOLESALE #521 on your credit card ending in 4821.",
    line: "1054.12 Costco Wholesale mastercard",
    name: "Costco Wholesale",
    amount: 1054.12,
    card: "c3",
  },
  {
    text: "Scotiabank: Your Amex Cobalt card was charged $102.50 by UBER EATS 800-555-0199 on Oct 27.",
    line: "102.50 Uber Eats amex",
    name: "Uber Eats",
    amount: 102.5,
    card: "c2",
  },
  {
    text: "CIBC: Interac debit purchase of 12,75 $ at SHOPPERS DRUG MART 1234 approved.",
    line: "12.75 Shoppers Drug Mart",
    name: "Shoppers Drug Mart",
    amount: 12.75,
    card: null,
  },
  {
    text: "TD Alert: Transaction of CAD 8.99 at SQ *NETFLIX.COM on your TD Visa *9876 was approved.",
    line: "8.99 Netflix.com scotia",
    name: "Netflix.com",
    amount: 8.99,
    card: "c4",
    category: "Subscription",
  },
];

console.log("\n--- Test 1: five sample notifications become Quick Add lines ---");
for (const s of SAMPLES) {
  const out = shareTextToQuickAdd(s.text, CARDS);
  assert(out && out.line === s.line, `"${s.text.slice(0, 40)}…" -> "${out?.line}"`);
  const parsed = parseQuickAdd(out.line, CARDS, TODAY);
  assert(
    parsed.isValid && parsed.amount === s.amount && parsed.name === s.name && (parsed.creditCardId || null) === s.card,
    `  Quick Add reads it as ${parsed.amount} "${parsed.name}" on ${parsed.accountName}`
  );
  if (s.category) assert(parsed.category === s.category, `  category ${parsed.category}`);
  assert(parsed.is_paid === true && parsed.date === TODAY, "  dated today and paid, like typing it");
}

console.log("\n--- Test 2: cards by last 4 digits or name ---");
assert(findSharedCard("card ending 9876", CARDS).id === "c4", "Last 4 digits pick the card whose name has them");
assert(findSharedCard("your Visa ending 5555", CARDS).id === "c1", "Unknown last 4 falls back to the name (first Visa)");
assert(findSharedCard("Scotia Visa purchase", CARDS).id === "c4", "More matching name words win");
assert(findSharedCard("purchase at a store", CARDS) === null, "No card words: no card (Primary Checking)");
assert(
  shareTextToQuickAdd("You spent $40 at VISA SHOP with your debit card", CARDS).line === "40 Visa Shop debit",
  "A payee that names a card is kept, and the line ends with debit so the card isn't picked"
);

console.log("\n--- Test 3: what isn't filled in ---");
assert(shareTextToQuickAdd("Your statement is ready to view", CARDS) === null, "No amount: null");
assert(shareTextToQuickAdd("A refund of $20.00 from AMAZON was credited to your Visa", CARDS) === null, "A refund isn't turned into spending");
assert(shareTextToQuickAdd("", CARDS) === null && shareTextToQuickAdd(null, CARDS) === null, "Empty share: null");
const income = shareTextToQuickAdd("You received $2,100.00 from ACME PAYROLL INC. Direct deposit", CARDS);
assert(income && income.line === "+2100 Acme Payroll Inc" && parseQuickAdd(income.line, CARDS, TODAY).type === "income", `A deposit becomes income: "${income?.line}"`);

console.log("\n--- Test 4: the share target's params reach Quick Add ---");
assert(SHARE_TARGET.action === "/quick" && SHARE_TARGET.method === "GET", "Share target opens /quick with GET");
// Android builds the URL from the manifest's params, like this
const shareUrl = (title, text) => {
  const q = new URLSearchParams();
  if (title) q.set(SHARE_TARGET.params.title, title);
  if (text) q.set(SHARE_TARGET.params.text, text);
  return `${SHARE_TARGET.action}?${q.toString()}`;
};
const url = new URL(shareUrl("TD Alert", SAMPLES[0].text), "https://fintrack.example");
assert(url.pathname === "/quick", "The share lands on Quick Add");
const fromShare = readSharedQuickAdd(url.search, CARDS);
assert(fromShare && fromShare.line === SAMPLES[0].line, `Title and text are read: "${fromShare?.line}"`);
const textOnly = readSharedQuickAdd(new URL(shareUrl("", SAMPLES[2].text), "https://x").search, CARDS);
assert(textOnly && textOnly.line === SAMPLES[2].line, "Text alone works (Android leaves an empty title out)");
const titleOnly = readSharedQuickAdd(new URL(shareUrl(SAMPLES[3].text, ""), "https://x").search, CARDS);
assert(titleOnly && titleOnly.line === SAMPLES[3].line, "Title alone works too");
assert(readSharedQuickAdd("?text=23.40%20lunch%20visa", CARDS) === null, "A Quick Add link (?text=23.40 lunch visa) isn't a share");
assert(
  JSON.stringify(parseQuickAddTextParam("?text=23.40%20lunch%20visa")) === JSON.stringify(["23.40 lunch visa"]),
  "…and still fills Quick Add as a link"
);
assert(withoutShareParams("?title=a&text=b&x=1") === "?x=1" && withoutShareParams("?title=a") === "", "Share params are cleared from the URL");

assert(
  restoreLinkList(JSON.stringify({ items: [{ text: "23.40 Tim Hortons visa", status: "pending" }], index: 0, sharedFrom: "share" })).sharedFrom === "share",
  "A shared entry is still marked as shared after a reload or re-login"
);

console.log("\n--- Test 5: review fixes ---");
// 1. A card payment is a transfer, not spending
for (const t of [
  "A payment of $500.00 from CHEQUING was applied to your Mastercard.",
  "TD: Your payment of $250.00 has been received. Thank you.",
  "You made a payment of $120.00 to your TD Visa ending 1234",
]) {
  const out = shareTextToQuickAdd(t, CARDS);
  assert(out && out.kind === "cardPayment" && out.line === null, `Card payment isn't filled as spending: "${t.slice(0, 45)}…"`);
}
const merchantPayment = shareTextToQuickAdd("Your payment of $8.99 to NETFLIX.COM on your Visa ending 1234 was approved.", CARDS);
assert(merchantPayment && merchantPayment.line === "8.99 Netflix.com visa", `A payment to a merchant is still spending (got "${merchantPayment?.line}")`);
// 2. A time before the payee is skipped
const timed = shareTextToQuickAdd("You spent $5.00 on Oct 28 at 9:14 AM at STARBUCKS with your TD Cash Back Visa.", CARDS);
assert(timed && timed.line === "5 Starbucks visa", `A time isn't the payee (got "${timed?.line}")`);
// 3. A balance before the purchase isn't the amount
const balanced = shareTextToQuickAdd("Your available balance is $1,234.56. You spent $23.40 at LOBLAWS with your Visa ending 1234.", CARDS);
assert(balanced && balanced.amount === 23.4 && balanced.line === "23.40 Loblaws visa", `The amount spent wins over a balance (got "${balanced?.line}")`);
const after = shareTextToQuickAdd("You spent $23.40 at LOBLAWS. Available credit: $4,100.00", CARDS);
assert(after && after.amount === 23.4, `A balance after the purchase is ignored (got ${after?.amount})`);
// 4. Last 4 digits that no card has: the card is a guess, so the page asks to check it
const unsure = shareTextToQuickAdd("You spent $9.00 at A&W with your Visa ending 5555", CARDS);
assert(unsure.cardUnsure === true && unsure.last4 === "5555" && unsure.card.id === "c1", "Unknown last 4: card guessed by name and flagged");
const sure = shareTextToQuickAdd(SAMPLES[0].text, CARDS);
assert(sure.cardUnsure === false && sure.last4 === null, "Known last 4: no flag");
assert(shareTextToQuickAdd("You spent $9.00 at A&W with your Visa", CARDS).cardUnsure === false, "No last 4 in the alert: no flag");
// 5. Sharing a web page is a share, so it doesn't fill the box as a link
assert(isShareParams("?title=Example%20page&text=https%3A%2F%2Fexample.com%2Fa") === true, "A page share (title + URL) is a share");
assert(isShareParams("?text=https%3A%2F%2Fexample.com%2Fa") === true, "A bare URL share is a share");
assert(readSharedQuickAdd("?title=Example%20page&text=https%3A%2F%2Fexample.com%2Fa", CARDS) === null, "…and isn't read as an alert");
assert(isShareParams("?text=23.40%20lunch%20visa") === false, "A Quick Add link is not a share");

console.log("\n--- Test 6: Maverick's follow-ups (card payments, bill payments, debit, Check the card) ---");
const charged = shareTextToQuickAdd("Netflix $16.49 was charged to your Visa", CARDS);
const chargedParsed = parseQuickAdd(charged?.line || "", CARDS, TODAY);
assert(
  charged.kind === "expense" && charged.line === "16.49 Netflix visa" && chargedParsed.name === "Netflix" && chargedParsed.creditCardId === "c1" && !charged.cardUnsure,
  `"charged to your Visa" is a Visa expense "Netflix" (got "${charged?.line}")`
);
const chargedPayment = shareTextToQuickAdd("Your payment of $16.49 was charged to your Visa by NETFLIX", CARDS);
assert(chargedPayment.kind === "expense", "Purchase words win over payment words");

const bill = shareTextToQuickAdd("Bill payment to HYDRO ONE $88.10 posted", CARDS);
const billParsed = parseQuickAdd(bill?.line || "", CARDS, TODAY);
assert(
  bill.kind === "expense" && bill.billPayment && bill.line === "88.10 Hydro One" && billParsed.creditCardId === null && billParsed.accountName === "Primary Checking" && !bill.cardUnsure,
  `A bill payment is a Checking expense to the payee (got "${bill?.line}")`
);
const ledger = [
  { id: "b0", type: "expense", name: "Hydro", amount: 88.1, is_paid: true },
  { id: "b1", type: "expense", name: "Rent", amount: 88.1, is_paid: false },
  { id: "b2", type: "expense", name: "Hydro", amount: 92.0, is_paid: false },
  { id: "b3", type: "expense", name: "Hydro", amount: 88.1, is_paid: false },
];
assert(findMatchingBill(ledger, bill.payee, bill.amount)?.id === "b3", "An unpaid bill with the same payee and amount is offered (Mark Hydro paid?)");
assert(findMatchingBill(ledger.slice(0, 3), bill.payee, bill.amount) === null, "No offer when no unpaid bill matches both payee and amount");

const received = shareTextToQuickAdd("Payment of $500.00 received on your Visa", CARDS);
assert(received.kind === "cardPayment" && received.line === null && received.card.id === "c1" && received.amount === 500, "A card payment fills nothing and names the card");
assert(cardPaymentLink(received, CARDS) === "/credit-cards?pay=c1&amount=500", `The Pay button opens that card's Pay dialog with $500 (got ${cardPaymentLink(received, CARDS)})`);
assert(
  cardPaymentLink(shareTextToQuickAdd("Thank you for your payment of $75.25", CARDS), CARDS) === "/credit-cards?amount=75.25",
  "Card not named: Credit Cards opens with the amount"
);
assert(shareTextToQuickAdd("Thank you for your payment of $75.25", [CARDS[0]]).kind === "cardPayment" && cardPaymentLink(shareTextToQuickAdd("Thank you for your payment of $75.25", [CARDS[0]]), [CARDS[0]]) === "/credit-cards?pay=c1&amount=75.25", "With one card, that card's Pay dialog opens");
assert(shareTextToQuickAdd("Your payment of $300 to TD Visa has been sent", CARDS).kind === "cardPayment", '"payment to <card name>" is a card payment');

const debit = shareTextToQuickAdd("Debit card ending 1234 purchase $6.45 at TIM HORTONS", CARDS);
const debitParsed = parseQuickAdd(debit?.line || "", CARDS, TODAY);
assert(
  debit.line === "6.45 Tim Hortons" && debitParsed.accountName === "Primary Checking" && debit.cardUnsure === false && debit.card === null,
  `Debit card wording is Checking with no note, even when 1234 is on a credit card (got "${debit?.line}")`
);
const debitUnknown = shareTextToQuickAdd("Purchase of $4.00 at SUBWAY with debit ending 7777", CARDS);
assert(debitUnknown.card === null && debitUnknown.cardUnsure === false, "A last 4 next to debit matching no card: Checking, no note");

const unknown = shareTextToQuickAdd("You spent $12.00 at SHELL with your Visa ending 9999", CARDS);
assert(unknown.cardUnsure === true && unknown.last4 === "9999", '"Visa ending 9999" with no such card shows Check the card');
const noAmex = shareTextToQuickAdd("$30.00 was charged to your Amex at UBER", CARDS.filter((c) => c.id !== "c2"));
assert(noAmex.cardUnsure === true && noAmex.last4 === null && noAmex.card === null, "A brand on none of the cards shows Check the card");

console.log("\nAll Share to FinTrack tests passed.");
