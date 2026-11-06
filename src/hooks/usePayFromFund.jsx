import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";
import PayFromFundDialog from "../components/Modals/PayFromFundDialog";
import CardFundsDialog from "../components/Modals/CardFundsDialog";
import { cardFundBills, coveredFundBills, defaultFundChecks, fundBillsPayload, fundForBill } from "../utils/planningAlerts";

/**
 * For a page that marks bills paid: askPayFrom(bill) resolves the options for markBillAsPaid, or null
 * when the person cancelled. Render `dialog`.
 * - a bill paid from Checking that a goal saves for: "Pay from <fund>" -> { payFromGoalId } (null unchecked)
 * - a payment to a card with bills that goals save for: "Use $X from <fund>" -> { fundBills }
 * defaultPayFrom(bill) is the same choice with the boxes as they default, without asking (bulk "Mark paid").
 */
const usePayFromFund = () => {
  const { data: goals } = useQuery({
    queryKey: ["savingsGoals"],
    queryFn: () => dashboardService.fetchSavingsGoals(),
  });
  const { data: cards } = useQuery({
    queryKey: ["creditCards"],
    queryFn: () => dashboardService.fetchCreditCards(),
  });
  const [prompt, setPrompt] = useState(null);

  const askPayFrom = useCallback(
    (bill) => {
      // One dialog at a time: a second tap while one is open cancels the first
      const ask = (next) =>
        new Promise((resolve) =>
          setPrompt((prev) => {
            prev?.resolve(null);
            return { ...next, resolve };
          })
        );
      const fundBills = cardFundBills(cards, bill);
      if (fundBills.length > 0) {
        const amount = Math.abs(parseFloat(bill.amount) || 0);
        const covered = coveredFundBills(fundBills, amount);
        // No fund with money that this payment covers: nothing to ask, the covered bills still roll over
        if (!fundBills.some((fb) => fb.use > 0 && covered.has(fb.billId))) {
          return Promise.resolve({ fundBills: fundBillsPayload(fundBills, new Set(), amount) });
        }
        return ask({ bill, fundBills });
      }
      const fund = fundForBill(goals, bill);
      if (!fund) return Promise.resolve({ payFromGoalId: null });
      return ask({ bill, fund });
    },
    [goals, cards]
  );

  const defaultPayFrom = useCallback(
    (bill) => {
      const fundBills = cardFundBills(cards, bill);
      if (fundBills.length > 0) {
        return { fundBills: fundBillsPayload(fundBills, defaultFundChecks(fundBills), Math.abs(parseFloat(bill.amount) || 0)) };
      }
      return { payFromGoalId: fundForBill(goals, bill)?.goalId || null };
    },
    [goals, cards]
  );

  const finish = (choice) => {
    prompt?.resolve(choice);
    setPrompt(null);
  };

  const dialog = !prompt ? null : prompt.fundBills ? (
    <CardFundsDialog
      bill={prompt.bill}
      fundBills={prompt.fundBills}
      onConfirm={finish}
      onCancel={() => finish(null)}
    />
  ) : (
    <PayFromFundDialog
      bill={prompt.bill}
      fund={prompt.fund}
      onConfirm={finish}
      onCancel={() => finish(null)}
    />
  );

  return { askPayFrom, defaultPayFrom, dialog };
};

export default usePayFromFund;
