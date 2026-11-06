import { useState } from "react";
import useTorontoMonth from "./useTorontoMonth";
import { followCurrentMonth } from "../utils/dateUtils";

// A page left open past Toronto's 1st moves on to the new month, unless another month was picked.
// selected is the page's "YYYY-MM"; onMove gets the new "YYYY-MM". Returns Toronto's current "YYYY-MM".
// Assumes the page first renders on the current month (Dashboard and Reports do): selected seeds
// the "last current month", so a page that opened on another month would be moved to this one.
const useFollowTorontoMonth = (selected, onMove) => {
  const currentMonth = useTorontoMonth();
  // Pages open on the current month, so start from what they opened on: a first render
  // that straddles midnight still moves on to the new month.
  const [lastCurrentMonth, setLastCurrentMonth] = useState(selected);
  if (lastCurrentMonth !== currentMonth) {
    setLastCurrentMonth(currentMonth);
    const next = followCurrentMonth(selected, lastCurrentMonth, currentMonth);
    if (next !== selected) onMove(next);
  }
  return currentMonth;
};

export default useFollowTorontoMonth;
