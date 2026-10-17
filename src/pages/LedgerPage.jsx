import { useState, useEffect, useMemo } from "react";
import { Search, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import dashboardService from "../services/dashboardService";

const CATEGORY_COLORS = {
  Income:                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Essentials:            "bg-zinc-800 text-zinc-300 border-white/[0.08]",
  "Food & Drink":        "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Subscription:          "bg-violet-500/10 text-violet-300 border-violet-500/20",
  Debt:                  "bg-rose-500/10 text-rose-300 border-rose-500/20",
  "Credit Card Payment": "bg-blue-500/10 text-blue-300 border-blue-500/20",
  "Debt Payment":        "bg-blue-500/10 text-blue-300 border-blue-500/20",
  "Savings Transfer":    "bg-teal-500/10 text-teal-300 border-teal-500/20",
  Transportation:        "bg-zinc-800 text-zinc-300 border-white/[0.08]",
  Entertainment:         "bg-pink-500/10 text-pink-300 border-pink-500/20",
  Shopping:              "bg-sky-500/10 text-sky-300 border-sky-500/20",
  Other:                 "bg-zinc-800/80 text-zinc-400 border-white/[0.06]",
};

const LedgerPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("all");

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
    await dashboardService.deleteBill(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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
    if (sortKey !== k) return <ArrowUpDown size={12} className="text-zinc-600 inline ml-1" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-zinc-200 inline ml-1" />
    ) : (
      <ArrowDown size={12} className="text-zinc-200 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading ledger...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="pt-6 mb-8">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Activity
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
          Transaction Ledger
        </h1>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Total Income</p>
          <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
            +${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-semibold text-rose-400 tabular-nums">
            -${totalExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Net All-Time</p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              totalIncome - totalExpense >= 0 ? "text-zinc-100" : "text-rose-400"
            }`}
          >
            ${(totalIncome - totalExpense).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/60 text-zinc-100 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-white/[0.07] focus:outline-none focus:border-zinc-500 placeholder-zinc-500 transition-colors"
          />
        </div>
        <div className="inline-flex p-1 rounded-xl bg-zinc-900/80 border border-white/[0.06]">
          {["all", "income", "expense", "transfer"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                typeFilter === t
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th
                  className="text-left py-3.5 px-4 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Description <SortIcon k="name" />
                </th>
                <th className="hidden sm:table-cell text-left py-3.5 px-4">
                  Category
                </th>
                <th
                  className="hidden sm:table-cell text-left py-3.5 px-4 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("date")}
                >
                  Date <SortIcon k="date" />
                </th>
                <th
                  className="text-right py-3.5 px-3 sm:px-4 cursor-pointer hover:text-zinc-300 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("amount")}
                >
                  Amount <SortIcon k="amount" />
                </th>
                <th className="w-9 sm:w-10 py-3.5 pr-3 sm:px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-zinc-500 text-xs py-12"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const formattedDate = new Date(
                    row.date + "T12:00:00"
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <tr
                      key={`${row.type}-${row.id}-${i}`}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <span className="text-zinc-200 font-medium text-sm block">
                          {row.name}
                        </span>
                        {/* Mobile inline Category + Date subtitle */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:hidden">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              CATEGORY_COLORS[row.category] ||
                              CATEGORY_COLORS.Other
                            }`}
                          >
                            {row.category}
                          </span>
                          <span className="text-[11px] text-zinc-500 tabular-nums">
                            · {formattedDate}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-4">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                            CATEGORY_COLORS[row.category] ||
                            CATEGORY_COLORS.Other
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-4 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-medium text-sm tabular-nums whitespace-nowrap">
                        <span
                          className={
                            row.type === "income"
                              ? "text-emerald-400"
                              : row.type === "transfer"
                              ? "text-zinc-400"
                              : "text-zinc-200"
                          }
                        >
                          {row.type === "income"
                            ? "+"
                            : row.type === "transfer"
                            ? "⇄ "
                            : "-"}
                          ${row.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 sm:px-4 text-right opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(row)}
                          title="Delete transaction"
                          className="btn-ghost-icon hover:text-rose-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/[0.05] px-4 py-2.5 flex justify-end">
          <p className="text-[11px] text-zinc-500 tabular-nums">
            {filtered.length} transactions
          </p>
        </div>
      </div>
    </div>
  );
};

export default LedgerPage;
