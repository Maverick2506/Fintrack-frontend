import { useState, useEffect } from "react";
import AddCreditCardModal from "../components/Modals/AddCreditCardModal";
import AddCreditCardPaymentModal from "../components/Modals/AddCreditCardPaymentModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";

const CreditCardPage = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    addCard: false,
    addPayment: false,
    deleteCard: false,
  });
  const [activeCardId, setActiveCardId] = useState(null);

  const fetchCreditCards = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.fetchCreditCards();
      setCards(data);
    } catch (error) {
      console.error("Error fetching credit cards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const openModal = (type, cardId = null) => {
    setActiveCardId(cardId);
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActiveCardId(null);
  };

  const handleDelete = async () => {
    await dashboardService.deleteCreditCard(activeCardId);
    closeModal("deleteCard");
    fetchCreditCards();
  };

  if (loading) {
    return (
      <div className="text-center text-white p-10">Loading credit cards...</div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Credit Cards</h1>
        <button
          onClick={() => openModal("addCard")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Credit Card
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          // FIX: Use the correct camelCase property names
          const utilization =
            parseFloat(card.creditLimit) > 0
              ? (parseFloat(card.currentBalance) /
                  parseFloat(card.creditLimit)) *
                100
              : 0;
          return (
            <div key={card.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{card.name}</h2>
                <div>
                  <button
                    onClick={() => openModal("deleteCard", card.id)}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => openModal("addPayment", card.id)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Pay
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {/* FIX: Use the correct camelCase property name */}
                Statement Balance: ${parseFloat(card.currentBalance).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">
                {/* FIX: Use the correct camelCase property name */}
                Due Date:{" "}
                {card.dueDate
                  ? new Date(card.dueDate).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })
                  : "N/A"}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                <div
                  className="bg-purple-500 h-2.5 rounded-full"
                  style={{ width: `${utilization.toFixed(0)}%` }}
                ></div>
              </div>
              <p className="text-xs text-right mt-1 text-gray-500">
                {utilization.toFixed(0)}% Utilized
              </p>
            </div>
          );
        })}
      </div>

      <AddCreditCardModal
        isOpen={modals.addCard}
        onClose={() => closeModal("addCard")}
        refreshData={fetchCreditCards}
      />
      <AddCreditCardPaymentModal
        isOpen={modals.addPayment}
        onClose={() => closeModal("addPayment")}
        refreshData={fetchCreditCards}
        cardId={activeCardId}
      />
      <ConfirmDeleteModal
        isOpen={modals.deleteCard}
        onClose={() => closeModal("deleteCard")}
        onConfirm={handleDelete}
        itemType="credit card"
      />
    </div>
  );
};

export default CreditCardPage;
