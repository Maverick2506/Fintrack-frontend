import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, CreditCard, Wifi, RefreshCw } from "lucide-react";
import AddCreditCardModal from "../components/Modals/AddCreditCardModal";
import AddCreditCardPaymentModal from "../components/Modals/AddCreditCardPaymentModal";
import EditCreditCardModal from "../components/Modals/EditCreditCardModal";
import RetireAccountModal from "../components/Modals/RetireAccountModal";
import SyncStatementModal from "../components/Modals/SyncStatementModal";
import dashboardService from "../services/dashboardService";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";
import { statementLines, scheduledPaymentLines } from "../utils/planningAlerts";
import { getTorontoTodayStr } from "../utils/dateUtils";

const CreditCardPage = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    addCard: false,
    addPayment: false,
    editCard: false,
  });
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [syncTarget, setSyncTarget] = useState(null);

  const [fixingId, setFixingId] = useState(null);
  // Amount for the Pay dialog when it opens from a shared card payment (/credit-cards?pay=<id>&amount=)
  const [payAmount, setPayAmount] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // "Pay statement balance" / "Pay full balance": edits only that scheduled payment
  const handleFixPayment = async (cardId, transactionId, pay) => {
    setFixingId(cardId);
    try {
      await dashboardService.setScheduledCardPayment(cardId, transactionId, pay);
      await fetchCreditCards();
    } catch (err) {
      // handleRequest already showed the error toast
      console.error("Failed to change the scheduled payment:", err);
    } finally {
      setFixingId(null);
    }
  };

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

  // Share → FinTrack sends a card payment here: open that card's Pay dialog with the amount filled in
  // (never paid until Record is tapped). ?amount= alone just waits for you to pick a card's Pay.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (loading || (!params.has("pay") && !params.has("amount"))) return;
    const amount = parseFloat(params.get("amount"));
    const card = cards.find((c) => c.id === params.get("pay"));
    if (amount > 0) setPayAmount(amount);
    if (card) {
      setActiveCardId(card.id);
      setActiveCard(card);
      setModals((prev) => ({ ...prev, addPayment: true }));
    }
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [loading, cards, location.pathname, location.search, navigate]);

  const openModal = (type, cardId = null, card = null) => {
    setActiveCardId(cardId);
    if (type === "editCard" || type === "addPayment") setActiveCard(card);
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    if (type === "addPayment") setPayAmount(null);
    setActiveCardId(null);
    if (type === "editCard" || type === "addPayment") setActiveCard(null);
  };

  const handleDelete = async (options) => {
    await dashboardService.deleteCreditCard(deleteTarget.id, options);
    setDeleteTarget(null);
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
            const lines = statementLines(card.statement, getTorontoTodayStr());
            const payment = scheduledPaymentLines(card.statement);
            // With a statement day, the due date is the statement's (the next one once this one is paid)
            const dueDate = lines ? lines.dueDate : card.dueDate;
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
                        <p className={`text-[11px] ${lines?.overdue ? "text-amber-400" : "text-zinc-500"}`}>
                          {dueDate
                            ? `${lines?.overdue ? "Overdue since" : "Due"} ${new Date(dueDate).toLocaleDateString(
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
                        onClick={() => setDeleteTarget(card)}
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
                    {lines && (
                      <dl className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className={`min-w-0 ${lines.overdue ? "text-amber-400" : "text-zinc-400"}`}>
                            {lines.balanceLabel}
                          </dt>
                          <dd
                            className={`tabular-nums font-medium shrink-0 ${
                              lines.paid ? "text-emerald-400" : lines.overdue ? "text-amber-400" : "text-zinc-100"
                            }`}
                          >
                            {lines.balance}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-zinc-500 min-w-0">{lines.chargesLabel}</dt>
                          <dd className="tabular-nums text-zinc-300 shrink-0">{lines.charges}</dd>
                        </div>
                      </dl>
                    )}
                    {/* A scheduled payment above the statement: what the rest pays, and a warning above what's owed */}
                    {payment?.explanation && (
                      <p className="mt-2 text-[11px] text-zinc-400 tabular-nums">{payment.explanation}</p>
                    )}
                    {payment?.warning && (
                      <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs">
                        <p className="text-amber-300 font-medium tabular-nums">{payment.warning}</p>
                        <div className="mt-2 flex flex-col min-[420px]:flex-row gap-2">
                          {payment.fixes.map((fix) => (
                            <button
                              key={fix.pay}
                              type="button"
                              onClick={() => handleFixPayment(card.id, payment.paymentId, fix.pay)}
                              disabled={fixingId === card.id}
                              className="btn-secondary min-h-10 justify-center tabular-nums disabled:opacity-50"
                            >
                              {fix.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSyncTarget(card)}
                        className="btn-secondary min-h-10 min-w-10 !px-2.5"
                        title="Sync with statement"
                        aria-label={`Sync ${card.name} with statement`}
                      >
                        <RefreshCw size={12} />
                        <span className="hidden min-[380px]:inline">Sync</span>
                      </button>
                      <button
                        onClick={() => openModal("addPayment", card.id, card)}
                        className="btn-secondary min-h-10 !px-3 !text-xs"
                      >
                        Pay Balance
                      </button>
                    </div>
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
        initialAmount={payAmount}
      />
      <EditCreditCardModal
        isOpen={modals.editCard}
        onClose={() => closeModal("editCard")}
        refreshData={fetchCreditCards}
        card={activeCard}
      />
      {syncTarget && (
        <SyncStatementModal
          account={{
            id: syncTarget.id,
            name: syncTarget.name,
            type: "CREDIT_CARD",
            balance: parseFloat(syncTarget.currentBalance) || 0,
          }}
          onClose={() => setSyncTarget(null)}
          onSynced={fetchCreditCards}
        />
      )}
      {deleteTarget && (
        <RetireAccountModal
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          onChanged={fetchCreditCards}
        />
      )}
    </div>
  );
};

export default CreditCardPage;
