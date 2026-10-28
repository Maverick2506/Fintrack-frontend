import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Repeat } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { suggestionText, suggestionAcceptedToast } from "../../utils/planningAlerts";

// "Make this a subscription?": charges that came about monthly 3 times without being a series.
// Accept turns the newest one into a monthly series; Dismiss is remembered by the server.
const SubscriptionSuggestions = () => {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const { data } = useQuery({
    queryKey: ["subscription-suggestions"],
    queryFn: () => dashboardService.fetchSubscriptionSuggestions(),
  });
  const suggestions = data?.suggestions || [];
  if (suggestions.length === 0) return null;

  const act = async (suggestion, action) => {
    if (busyId) return;
    setBusyId(suggestion.id);
    try {
      if (action === "accept") {
        const result = await dashboardService.acceptSubscriptionSuggestion(suggestion.id);
        toast.success(suggestionAcceptedToast(suggestion, result));
      } else {
        await dashboardService.dismissSubscriptionSuggestion(suggestion.id);
        // handleRequest refreshes every query; drop the card right away too
        queryClient.setQueryData(["subscription-suggestions"], (old) => ({
          suggestions: (old?.suggestions || []).filter((s) => s.id !== suggestion.id),
        }));
      }
    } catch (error) {
      console.error("Suggestion action failed:", error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="glass-panel p-4 sm:p-5" aria-label="Subscription suggestions">
      <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Repeat size={12} /> Make this a subscription?
      </h2>
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{s.title}</p>
              <p className="text-[11px] text-zinc-500 tabular-nums">
                {suggestionText(s)} · {s.accountName}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => act(s, "dismiss")}
                disabled={busyId === s.id}
                className="btn-secondary min-h-10 flex-1 min-[420px]:flex-none justify-center"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => act(s, "accept")}
                disabled={busyId === s.id}
                className="btn-primary min-h-10 flex-1 min-[420px]:flex-none justify-center"
              >
                Accept
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SubscriptionSuggestions;
