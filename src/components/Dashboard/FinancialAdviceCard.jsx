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
  <div className="bg-gray-800 p-4 rounded-lg">
    <h2 className="text-sm font-semibold text-gray-400 mb-3">
      FINANCIAL WELLNESS
    </h2>
    {advice ? (
      <div className="bg-gray-700 p-3 rounded-md mb-4 text-sm text-gray-200 leading-relaxed border-l-4 border-indigo-500">
        {advice.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{renderMarkdown(line)}</p>
        ))}
      </div>
    ) : (
      <p className="text-gray-300 text-sm mb-4">
        Get a personalized financial tip based on your current data.
      </p>
    )}
    <button
      onClick={onGetAdvice}
      disabled={isLoading}
      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Thinking..." : advice ? "✨ Get Fresh Advice" : "✨ Get Financial Advice"}
    </button>
  </div>
);

export default FinancialAdviceCard;
