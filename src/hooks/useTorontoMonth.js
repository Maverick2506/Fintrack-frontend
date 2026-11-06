import { useSyncExternalStore } from "react";
import { getTorontoMonthKey } from "../utils/dateUtils";

// Toronto's month as "YYYY-MM". Re-read when the tab comes back into view, gets focus,
// and once a minute, so a tab left open past the 1st notices the new month.
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

const useTorontoMonth = () =>
  useSyncExternalStore(subscribe, () => getTorontoMonthKey(), () => getTorontoMonthKey());

export default useTorontoMonth;
