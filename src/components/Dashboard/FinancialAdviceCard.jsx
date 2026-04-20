import React from "react";

// Lightweight markdown bold renderer — converts **text** to <strong>
const renderMarkdown = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const FinancialAdviceCard = ({ advice, onGetAdvice, isLoading }) => (
  <div className="glass-panel p-6 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/20 transition-colors" />
    <h2 className="text-sm tracking-widest font-bold text-indigo-300/80 mb-4 uppercase flex items-center gap-2">
      <span className="text-lg">✨</span> AI Financial Wellness
    </h2>
    {advice ? (
      <div className="bg-black/20 p-4 rounded-xl mb-6 text-[13px] text-indigo-100/90 leading-relaxed border border-indigo-500/20 shadow-inner backdrop-blur-md">
        {advice.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>{renderMarkdown(line)}</p>
        ))}
      </div>
    ) : (
      <div className="bg-black/20 p-4 rounded-xl mb-6 border border-dashed border-indigo-500/30 text-center">
        <p className="text-indigo-200/60 text-sm font-medium">
          Ready for personalized financial tips?
        </p>
      </div>
    )}
    <button
      onClick={onGetAdvice}
      disabled={isLoading}
      className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_15px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.6)] active:scale-[0.98]"
    >
      {isLoading ? "Analyzing your finances..." : advice ? "Generate Fresh Insights" : "Analyze My Data"}
    </button>
  </div>
);

export default FinancialAdviceCard;
