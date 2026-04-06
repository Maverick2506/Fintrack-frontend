import { useState, useEffect, useMemo } from "react";
import dashboardService from "../services/dashboardService";

const CATEGORY_COLORS = {
  Income:         "bg-green-900 text-green-300",
  Essentials:     "bg-blue-900 text-blue-300",
  "Food & Drink": "bg-orange-900 text-orange-300",
  Subscription:   "bg-purple-900 text-purple-300",
  Debt:           "bg-red-900 text-red-300",
  Transportation: "bg-yellow-900 text-yellow-300",
  Entertainment:  "bg-pink-900 text-pink-300",
  Shopping:       "bg-cyan-900 text-cyan-300",
  Other:          "bg-gray-700 text-gray-300",
};

const LedgerPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("all"); // all | income | expense

  useEffect(() => {
    dashboardService.fetchLedger().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDelete = async (row) => {
    if (row.type !== "expense") return;
    await dashboardService.deleteBill(row.id);
    setRows((prev) => prev.filter((r) => !(r.id === row.id && r.type === "expense")));
  };

  const filtered = useMemo(() => {
    let data = rows;
    if (typeFilter !== "all") data = data.filter((r) => r.type === typeFilter);
    if (search) data = data.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    return [...data].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "date") { va = new Date(va); vb = new Date(vb); }
      if (sortKey === "amount") { va = parseFloat(va); vb = parseFloat(vb); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, sortKey, sortDir, typeFilter]);

  const totalIncome = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-indigo-400 ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  if (loading) return <div className="text-center text-white p-10">Loading ledger...</div>;

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Transaction Ledger</h1>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">TOTAL INCOME</p>
          <p className="text-xl font-bold text-green-400">+${totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">TOTAL EXPENSES</p>
          <p className="text-xl font-bold text-red-400">-${totalExpense.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">NET ALL TIME</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-white" : "text-red-400"}`}>
            ${(totalIncome - totalExpense).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          {["all","income","expense"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                typeFilter === t
                  ? t === "income" ? "bg-green-700 text-white" : t === "expense" ? "bg-red-700 text-white" : "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400">
              <th className="text-left p-3 cursor-pointer hover:text-white" onClick={() => handleSort("name")}>
                Name <SortIcon k="name" />
              </th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3 cursor-pointer hover:text-white" onClick={() => handleSort("date")}>
                Date <SortIcon k="date" />
              </th>
              <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => handleSort("amount")}>
                Amount <SortIcon k="amount" />
              </th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 p-8">No transactions found.</td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={`${row.type}-${row.id}-${i}`}
                  className="border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors group"
                >
                  <td className="p-3">
                    <span className="text-white font-medium">{row.name}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[row.category] || CATEGORY_COLORS.Other}`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">
                    {new Date(row.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    <span className={row.type === "income" ? "text-green-400" : "text-red-400"}>
                      {row.type === "income" ? "+" : "-"}${row.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.type === "expense" && (
                      <button
                        onClick={() => handleDelete(row)}
                        title="Delete expense"
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="text-xs text-gray-600 text-right p-3">{filtered.length} transactions</p>
      </div>
    </div>
  );
};

export default LedgerPage;
