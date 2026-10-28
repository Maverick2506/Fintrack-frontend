import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";
import PayFromFundDialog from "../components/Modals/PayFromFundDialog";
import { fundForBill } from "../utils/planningAlerts";

/**
 * For a page that marks bills paid: askPayFrom(bill) resolves { payFromGoalId } (null when no goal saves
 * for the bill, or the box was unchecked), or null when the person cancelled. Render `dialog`.
 * defaultPayFrom(bill) is the box's default without asking (bulk "Mark paid"): the goal id, or null.
 */
const usePayFromFund = () => {
  const { data: goals } = useQuery({
    queryKey: ["savingsGoals"],
    queryFn: () => dashboardService.fetchSavingsGoals(),
  });
  const [prompt, setPrompt] = useState(null);

  const askPayFrom = useCallback(
    (bill) => {
      const fund = fundForBill(goals, bill);
      if (!fund) return Promise.resolve({ payFromGoalId: null });
      return new Promise((resolve) => setPrompt({ bill, fund, resolve }));
    },
    [goals]
  );

  const defaultPayFrom = useCallback((bill) => fundForBill(goals, bill)?.goalId || null, [goals]);

  const finish = (choice) => {
    prompt?.resolve(choice);
    setPrompt(null);
  };

  const dialog = prompt ? (
    <PayFromFundDialog
      bill={prompt.bill}
      fund={prompt.fund}
      onConfirm={finish}
      onCancel={() => finish(null)}
    />
  ) : null;

  return { askPayFrom, defaultPayFrom, dialog };
};

export default usePayFromFund;
