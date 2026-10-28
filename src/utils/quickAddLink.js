/**
 * Quick Add links (from the Gemini Gem): /quick?text=<url-encoded Quick Add text>
 * One entry per line. Nothing is ever saved from a link; the page only fills the input.
 */

export const TEXT_PARAM = "text";
export const MAX_LINK_LINES = 20;
const MAX_LINE_LENGTH = 200;

// "?text=23.40%20lunch%20visa%0A4.50%20coffee" -> ["23.40 lunch visa", "4.50 coffee"]
export const parseQuickAddTextParam = (search) => {
  const raw = new URLSearchParams(search || "").get(TEXT_PARAM);
  if (!raw) return [];
  return raw
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, " ").trim().slice(0, MAX_LINE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LINK_LINES);
};

// "/quick?text=12.50%20lunch%20visa": the Quick Add page with the text filled in, never saved
export const buildQuickAddLink = (text) => {
  const lines = String(text || "")
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, " ").trim().slice(0, MAX_LINE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LINK_LINES);
  if (!lines.length) return "/quick";
  return `/quick?${new URLSearchParams({ [TEXT_PARAM]: lines.join("\n") }).toString()}`;
};

// The same query string without the text parameter ("" when nothing is left)
export const withoutTextParam = (search) => {
  const params = new URLSearchParams(search || "");
  params.delete(TEXT_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
};

// Checks a link list saved in sessionStorage (so a reload or re-login mid-list doesn't lose it).
// Returns { items, index, sharedFrom } pointing at a pending entry, or null when there's nothing usable.
export const restoreLinkList = (raw) => {
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) return null;
    const items = data.items
      .slice(0, MAX_LINK_LINES)
      .filter((it) => it && typeof it.text === "string" && it.text.trim())
      .map((it) => ({
        text: it.text.slice(0, MAX_LINE_LENGTH),
        status: it.status === "saved" || it.status === "skipped" ? it.status : "pending",
      }));
    const preferred = Number.isInteger(data.index) ? data.index : 0;
    const index =
      items[preferred] && items[preferred].status === "pending"
        ? preferred
        : items.findIndex((it) => it.status === "pending");
    // "share" when the entry came from Share -> FinTrack
    if (index === -1) return null;
    return data.sharedFrom === "share" ? { items, index, sharedFrom: "share" } : { items, index };
  } catch {
    return null;
  }
};

// Only same-site paths, so ?next= can't send someone to another site after login
export const getSafeNextPath = (search) => {
  const next = new URLSearchParams(search || "").get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return "/";
  return next;
};

// "/login?next=<where you were>" so logging in brings you back, text and all
export const buildLoginPath = (pathname, search = "") => {
  const here = `${pathname || "/"}${search || ""}`;
  if (here === "/" || pathname === "/login") return "/login";
  return `/login?next=${encodeURIComponent(here)}`;
};
