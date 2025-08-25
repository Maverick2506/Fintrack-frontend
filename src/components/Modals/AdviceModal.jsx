import React from "react";

const AdviceModal = ({ isOpen, onClose, advice, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm text-center">
        <h2 className="text-xl font-bold mb-4 text-white">
          Your Financial Tip
        </h2>
        {isLoading ? (
          <p className="text-gray-300 animate-pulse">Getting your advice...</p>
        ) : (
          <p className="text-gray-300">{advice}</p>
        )}
        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AdviceModal;
