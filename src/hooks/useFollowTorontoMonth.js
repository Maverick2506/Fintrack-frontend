import { useState } from "react";
import useTorontoMonth from "./useTorontoMonth";
import { followCurrentMonth } from "../utils/dateUtils";

// A page left open past Toronto's 1st moves on to the new month, unless another month was picked.
// selected is the page's "YYYY-MM"; onMove gets the new "YYYY-MM". Returns Toronto's current "YYYY-MM".
const useFollowTorontoMonth = (selected, onMove) => {
  const currentMonth = useTorontoMonth();
  const [lastCurrentMonth, setLastCurrentMonth] = useState(currentMonth);
  if (lastCurrentMonth !== currentMonth) {
    setLastCurrentMonth(currentMonth);
    const next = followCurrentMonth(selected, lastCurrentMonth, currentMonth);
    if (next !== selected) onMove(next);
  }
  return currentMonth;
};

export default useFollowTorontoMonth;
