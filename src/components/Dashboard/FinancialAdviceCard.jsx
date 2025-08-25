import React from "react";

const FinancialAdviceCard = ({ onGetAdvice, isLoading }) => (
  <div className="bg-gray-800 p-4 rounded-lg">
    <h2 className="text-sm font-semibold text-gray-400 mb-3">
      FINANCIAL WELLNESS
    </h2>
    <p className="text-gray-300 text-sm mb-4">
      Get a personalized financial tip based on your current data.
    </p>
    <button
      onClick={onGetAdvice}
      disabled={isLoading}
      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Thinking..." : "✨ Get Financial Advice"}
    </button>
  </div>
);

export default FinancialAdviceCard;
