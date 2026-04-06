import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddDebtModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [autoPay, setAutoPay] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");

  const getPaymentLabel = () => {
    if (!autoPay) return "Monthly Payment/Estimate";
    switch (paymentFrequency) {
      case "weekly": return "Weekly Payment";
      case "bi-weekly": return "Bi-Weekly Payment";
      case "yearly": return "Yearly Payment";
      default: return "Monthly Payment";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !totalAmount || !monthlyPayment) return;

    await dashboardService.addDebt({
      name,
      total_amount: totalAmount,
      monthly_payment: monthlyPayment,
      auto_pay: autoPay,
      next_due_date: autoPay ? nextDueDate : null,
      payment_frequency: autoPay ? paymentFrequency : "monthly",
    });
    
    // Reset form after submission
    setName("");
    setTotalAmount("");
    setMonthlyPayment("");
    setAutoPay(false);
    setNextDueDate(new Date().toISOString().slice(0, 10));
    setPaymentFrequency("monthly");
    
    onClose();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">Add New Debt</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="debtName"
              className="block text-sm font-medium text-gray-300"
            >
              Debt Name
            </label>
            <input
              type="text"
              id="debtName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="totalAmount"
              className="block text-sm font-medium text-gray-300"
            >
              Total Amount
            </label>
            <input
              type="number"
              id="totalAmount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="monthlyPayment"
              className="block text-sm font-medium text-gray-300"
            >
              {getPaymentLabel()}
            </label>
            <input
              type="number"
              id="monthlyPayment"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          
          <div className="mb-4 flex items-center">
             <input type="checkbox" id="autoPay" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} className="mr-2" />
             <label htmlFor="autoPay" className="text-sm font-medium text-gray-300">Enable Auto-Pay Engine</label>
          </div>
          
          {autoPay && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300">Start / Next Due Date</label>
                <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300">Payment Frequency</label>
                <select value={paymentFrequency} onChange={(e) => setPaymentFrequency(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2">
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtModal;
