import { useSyncExternalStore } from "react";
import { getTorontoTodayStr } from "../utils/dateUtils";

// Toronto's clock, re-read when the tab comes back into view, gets focus, and once a minute,
// so a tab left open past midnight (or past the 1st) notices the new day (or month).
const subscribe = (onChange) => {
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  const timer = window.setInterval(onChange, 60 * 1000);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
    window.clearInterval(timer);
  };
};

/** Toronto's today as "YYYY-MM-DD". */
export const useTorontoToday = () =>
  useSyncExternalStore(subscribe, () => getTorontoTodayStr(), () => getTorontoTodayStr());

/** Toronto's month as "YYYY-MM". */
const useTorontoMonth = () => useTorontoToday().slice(0, 7);

export default useTorontoMonth;
