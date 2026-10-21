import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CreditCard, Wifi } from "lucide-react";
import AddCreditCardModal from "../components/Modals/AddCreditCardModal";
import AddCreditCardPaymentModal from "../components/Modals/AddCreditCardPaymentModal";
import EditCreditCardModal from "../components/Modals/EditCreditCardModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";

const CreditCardPage = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    addCard: false,
    addPayment: false,
    deleteCard: false,
    editCard: false,
  });
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

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

  const openModal = (type, cardId = null, card = null) => {
    setActiveCardId(cardId);
    if (type === "editCard" || type === "addPayment") setActiveCard(card);
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActiveCardId(null);
    if (type === "editCard" || type === "addPayment") setActiveCard(null);
  };

  const handleDelete = async () => {
    await dashboardService.deleteCreditCard(activeCardId);
    closeModal("deleteCard");
    fetchCreditCards();
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading credit cards...
      </div>
    );
  }

  const totalBalance = cards.reduce(
    (s, c) => s + (parseFloat(c.currentBalance) || 0),
    0
  );
  const totalLimit = cards.reduce(
    (s, c) => s + (parseFloat(c.creditLimit) || 0),
    0
  );
  const totalAvailable = Math.max(0, totalLimit - totalBalance);
  const overallUtilization =
    totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex justify-between items-center pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Revolving Credit
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Credit Cards
          </h1>
        </div>
        <button
          onClick={() => openModal("addCard")}
          className="btn-primary"
        >
          <Plus size={14} strokeWidth={2} />
          <span>Add Card</span>
        </button>
      </div>

      {cards.length > 0 && (
        <CompactSummaryBar
          items={[
            {
              label: "Total Card Balance",
              shortLabel: "Balance",
              value: `$${totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            {
              label: "Available Credit",
              shortLabel: "Available",
              value: `$${totalAvailable.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              colorClass: "text-emerald-400",
            },
            {
              label: "Overall Utilization",
              shortLabel: "Utilization",
              value: `${overallUtilization.toFixed(1)}%`,
              colorClass:
                overallUtilization > 70
                  ? "text-rose-400"
                  : overallUtilization > 30
                  ? "text-amber-400"
                  : "text-emerald-400",
            },
          ]}
        />
      )}

      {cards.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3">
            <CreditCard size={18} />
          </div>
          <p className="text-zinc-300 text-sm font-medium mb-1">
            No credit cards tracked yet
          </p>
          <p className="text-zinc-500 text-xs max-w-xs mb-5">
            Add your credit cards to monitor statement balances, credit limits, and utilization ratios.
          </p>
          <button
            onClick={() => openModal("addCard")}
            className="btn-primary"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add First Card</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const balance = parseFloat(card.currentBalance) || 0;
            const limit = parseFloat(card.creditLimit) || 0;
            const available = Math.max(0, limit - balance);
            const utilization = limit > 0 ? (balance / limit) * 100 : 0;
            const barColor =
              utilization > 70
                ? "bg-rose-400"
                : utilization > 30
                ? "bg-amber-400"
                : "bg-emerald-400";

            return (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/[0.09] p-5 flex flex-col justify-between shadow-lg"
              >
                {/* Top Physical Card Header: Chip + Name + Actions */}
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      {/* Matte metallic EMV chip */}
                      <div className="w-9 h-7 rounded-md bg-gradient-to-br from-zinc-700/80 to-zinc-800/90 border border-white/15 flex items-center justify-center">
                        <Wifi
                          size={12}
                          className="text-zinc-300 rotate-90 opacity-75"
                        />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                          {card.name}
                        </h2>
                        <p className="text-[11px] text-zinc-500">
                          {card.dueDate
                            ? `Due ${new Date(card.dueDate).toLocaleDateString(
                                "en-US",
                                {
                                  timeZone: "UTC",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}`
                            : "No statement due date"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal("editCard", card.id, card)}
                        title="Edit card"
                        className="btn-ghost-icon"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => openModal("deleteCard", card.id)}
                        title="Delete card"
                        className="btn-ghost-icon hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mb-5">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                        Current Balance
                      </span>
                      <span className="text-[11px] text-zinc-400 tabular-nums">
                        ${available.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} available
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between tabular-nums">
                      <span className="text-2xl font-semibold text-zinc-100 tracking-tight">
                        $
                        {balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-zinc-500">
                        of ${limit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Utilization Gauge + Pay Action Footer */}
                <div>
                  <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mb-3">
                    <div
                      className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
                      style={{
                        width:
                          utilization > 0
                            ? `max(${Math.min(100, utilization).toFixed(0)}%, 4px)`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      {utilization.toFixed(0)}% utilization
                    </span>
                    <button
                      onClick={() => openModal("addPayment", card.id, card)}
                      className="btn-secondary !py-1 !px-3 !text-xs"
                    >
                      Pay Balance
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        card={activeCard}
      />
      <EditCreditCardModal
        isOpen={modals.editCard}
        onClose={() => closeModal("editCard")}
        refreshData={fetchCreditCards}
        card={activeCard}
      />
      <ConfirmDeleteModal
        isOpen={modals.deleteCard}
        onClose={() => closeModal("deleteCard")}
        onConfirm={handleDelete}
        itemType="credit card"
        itemName={activeCard?.name}
      />
    </div>
  );
};

export default CreditCardPage;
