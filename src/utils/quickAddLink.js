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

// The same query string without the text parameter ("" when nothing is left)
export const withoutTextParam = (search) => {
  const params = new URLSearchParams(search || "");
  params.delete(TEXT_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
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
