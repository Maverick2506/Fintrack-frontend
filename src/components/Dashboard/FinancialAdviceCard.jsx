import React from "react";
import { Sparkles } from "lucide-react";

const renderMarkdown = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-zinc-100 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const FinancialAdviceCard = ({ advice, onGetAdvice, isLoading }) => (
  <div className="glass-panel p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles size={13} className="text-zinc-300" />
        <span>AI Financial Advisor</span>
      </h2>
      <button
        onClick={onGetAdvice}
        disabled={isLoading}
        className="btn-secondary !py-1 !px-2.5 !text-[11px]"
      >
        {isLoading ? "Analyzing..." : advice ? "Refresh" : "Generate Insight"}
      </button>
    </div>

    {advice ? (
      <div className="bg-zinc-950/80 p-4 rounded-xl text-xs text-zinc-300 leading-relaxed border border-white/[0.06]">
        {advice.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>
            {renderMarkdown(line)}
          </p>
        ))}
      </div>
    ) : (
      <div className="py-6 rounded-xl border border-dashed border-white/[0.06] text-center">
        <p className="text-zinc-500 text-xs font-medium">
          Generate a personalized cash-flow projection and savings recommendation.
        </p>
      </div>
    )}
  </div>
);

export default FinancialAdviceCard;
