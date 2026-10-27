import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  FileText,
  CreditCard,
  Wallet,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  ListChecks,
  Link2,
  Link2Off,
  RotateCcw,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import { EXPENSE_CATEGORIES } from "../constants/categories.js";
import { formatCurrency, formatShortDate } from "../utils/formatUtils";
import {
  IMPORT_DATE_FORMATS,
  importCountsLine,
  isMappingComplete,
  rowOutcome,
  countOutcomes,
  buildCommitRows,
  columnOptionLabel,
} from "../utils/csvImport";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const STATUS_BADGES = {
  match: { label: "Match", className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  new: { label: "New", className: "text-sky-300 bg-sky-500/10 border-sky-500/20" },
  skip: { label: "Skipped", className: "text-zinc-400 bg-white/[0.04] border-white/[0.08]" },
};

const selectClass =
  "w-full min-w-0 h-10 bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500";

// Bank or card CSV import: pick the account, upload, check the columns, review the preview, import.
const ImportPage = () => {
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [edits, setEdits] = useState({});
  const [showSkipped, setShowSkipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorColumns, setErrorColumns] = useState(null);
  const [result, setResult] = useState(null);

  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError, refetch: refetchAccounts } = useQuery({
    queryKey: ["importAccounts"],
    queryFn: () => dashboardService.fetchImportAccounts(),
  });
  const account = accounts.find((a) => a.id === accountId);

  const runPreview = async (nextFile, nextMapping) => {
    if (!accountId || !nextFile) return;
    setLoading(true);
    setError(null);
    setErrorColumns(null);
    try {
      const data = await dashboardService.previewImport({ accountId, file: nextFile, mapping: nextMapping });
      setPreview(data);
      setMapping(data.mapping);
      setEdits({});
      setShowSkipped(false);
      // A guessed mapping is worth a look; a saved one stays folded away
      setMappingOpen(data.mappingSource === "suggested");
    } catch (err) {
      const body = err?.response?.data;
      setError(body?.error || "Could not read the file.");
      // A mapping that reads nothing comes back with the file's columns, so it can be fixed here
      if (body?.details?.columns) {
        setErrorColumns(body.details);
        setMapping(nextMapping || body.details.suggestedMapping);
        setMappingOpen(true);
      }
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const onFileChosen = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setResult(null);
    if (!/\.csv$/i.test(chosen.name)) {
      setError("Pick a .csv file. Most banks have \"Download transactions\" with a CSV option.");
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setError("The file is over 2 MB. Download a shorter date range.");
      return;
    }
    setFile(chosen);
    setMapping(null);
    runPreview(chosen, undefined);
  };

  const pickAccount = (id) => {
    setAccountId(id);
    setFile(null);
    setPreview(null);
    setMapping(null);
    setError(null);
    setErrorColumns(null);
    setResult(null);
  };

  const setEdit = (line, patch) =>
    setEdits((prev) => ({ ...prev, [line]: { ...(prev[line] || {}), ...patch } }));

  const counts = useMemo(() => countOutcomes(preview?.rows, edits), [preview, edits]);
  const toImport = counts.matched + counts.new;
  const visibleRows = useMemo(
    () => (preview?.rows || []).filter((r) => showSkipped || r.status !== "duplicate"),
    [preview, showSkipped]
  );
  const duplicateCount = (preview?.rows || []).filter((r) => r.status === "duplicate").length;

  const commit = async () => {
    if (!preview || toImport === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await dashboardService.commitImport({
        accountId,
        mapping,
        rows: buildCommitRows(preview.rows, edits),
      });
      setResult(res);
      setPreview(null);
      setFile(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err?.response?.data?.error || "The import didn't go through. Nothing was saved; try again.");
    } finally {
      setCommitting(false);
    }
  };

  const columns = preview?.columns || errorColumns?.columns || [];
  const sampleRows = preview?.sampleRows || errorColumns?.sampleRows || [];
  const columnOptions = columns.map((_, i) => ({
    value: i,
    label: columnOptionLabel(columns, sampleRows, mapping?.hasHeader, i),
  }));
  const usesDebitCredit = mapping && (mapping.amount === undefined || mapping.amount === null);
  const updateMapping = (patch) => setMapping((prev) => ({ ...prev, ...patch }));

  return (
    <div className={`max-w-3xl mx-auto px-4 sm:px-6 pt-6 ${preview ? "pb-44" : "pb-24"}`}>
      <Link
        to="/ledger"
        className="inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Ledger</span>
      </Link>
      <div className="flex items-center gap-2 mt-1">
        <Upload size={18} className="text-zinc-400" />
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Import CSV</h1>
      </div>
      <p className="text-xs text-zinc-500 mt-1 mb-5">
        Download transactions from your bank or card as a CSV, then add them here. Bills you already
        track are marked paid instead of added twice, and a file imported before is skipped.
      </p>

      {result && (
        <div className="glass-panel p-4 mb-5 border-emerald-500/25">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Check size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100">Imported</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {result.created} added · {result.matched} bills marked paid · {result.skipped} skipped
              </p>
            </div>
          </div>
          {result.created > 0 && (
            <Link to="/review" className="btn-primary h-10 w-full sm:w-auto mt-3">
              <Inbox size={14} />
              <span>Review {result.created} new</span>
            </Link>
          )}
        </div>
      )}

      {/* 1. Account */}
      <section className="mb-5">
        <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">1. Account</h2>
        {accountsLoading ? (
          <div className="text-xs text-zinc-500 py-3">Loading accounts...</div>
        ) : accountsError ? (
          <div className="flex items-center gap-3 text-xs text-rose-400 py-1">
            <span>Could not load your accounts.</span>
            <button type="button" onClick={() => refetchAccounts()} className="btn-secondary h-10 px-3">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {accounts.map((a) => {
              const Icon = a.type === "CREDIT_CARD" ? CreditCard : Wallet;
              const active = a.id === accountId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAccount(a.id)}
                  className={`flex items-center gap-3 min-h-12 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-white/[0.08] border-white/25 text-zinc-100"
                      : "bg-zinc-900/50 border-white/[0.07] text-zinc-300 hover:border-white/[0.15]"
                  }`}
                >
                  <Icon size={16} className={a.type === "CREDIT_CARD" ? "text-amber-400 shrink-0" : "text-emerald-400 shrink-0"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{a.name}</span>
                    <span className="block text-[11px] text-zinc-500">
                      {a.hasSavedMapping ? "Columns saved from last import" : a.type === "CREDIT_CARD" ? "Credit card" : "Checking"}
                    </span>
                  </span>
                  {active && <Check size={15} className="text-zinc-100 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. File */}
      {accountId && (
        <section className="mb-5">
          <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">2. File</h2>
          <label
            className={`flex items-center gap-3 min-h-14 px-3 py-2 rounded-xl border border-dashed cursor-pointer transition-colors ${
              file ? "border-white/[0.15] bg-zinc-900/50" : "border-white/20 hover:border-white/35 bg-zinc-900/30"
            }`}
          >
            <FileText size={18} className="text-zinc-400 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-200 truncate">{file ? file.name : "Choose a .csv file"}</span>
              <span className="block text-[11px] text-zinc-500">
                {loading ? "Reading..." : file ? "Tap to choose another" : "Up to 2 MB and 2,000 rows"}
              </span>
            </span>
            <input type="file" accept=".csv,text/csv" onChange={onFileChosen} className="sr-only" />
          </label>
          <p className="text-[11px] text-zinc-500 mt-2">
            Imported rows change {account?.name || "the account"}'s balance, as if you added them by hand.
          </p>
        </section>
      )}

      {error && (
        <div className="glass-panel p-3 mb-5 border-rose-500/25" role="alert">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* 3. Columns */}
      {mapping && columns.length > 0 && (
        <section className="mb-5">
          <button
            type="button"
            onClick={() => setMappingOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 h-10 text-left cursor-pointer"
            aria-expanded={mappingOpen}
          >
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">3. Columns</span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              {preview?.mappingSource === "saved" && !mappingOpen ? "Saved from last import · Change" : mappingOpen ? "Hide" : "Change"}
              {mappingOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
          {mappingOpen && (
            <div className="glass-panel p-3 sm:p-4 space-y-3">
              <label className="flex items-center gap-3 min-h-10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(mapping.hasHeader)}
                  onChange={(e) => updateMapping({ hasHeader: e.target.checked })}
                  className="w-4 h-4 accent-zinc-100"
                />
                <span className="text-sm text-zinc-200">The first row is column names</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="block text-[11px] text-zinc-400 mb-1">Date</span>
                  <select
                    className={selectClass}
                    value={mapping.date}
                    onChange={(e) => updateMapping({ date: Number(e.target.value) })}
                  >
                    {columnOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="block text-[11px] text-zinc-400 mb-1">Date format</span>
                  <select
                    className={selectClass}
                    value={mapping.dateFormat}
                    onChange={(e) => updateMapping({ dateFormat: e.target.value })}
                  >
                    {IMPORT_DATE_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="block text-[11px] text-zinc-400 mb-1">Description</span>
                  <select
                    className={selectClass}
                    value={mapping.description?.[0] ?? 0}
                    onChange={(e) => updateMapping({ description: [Number(e.target.value), ...(mapping.description || []).slice(1)] })}
                  >
                    {columnOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="block text-[11px] text-zinc-400 mb-1">More description (optional)</span>
                  <select
                    className={selectClass}
                    value={mapping.description?.[1] ?? ""}
                    onChange={(e) =>
                      updateMapping({
                        description:
                          e.target.value === ""
                            ? [mapping.description?.[0] ?? 0]
                            : [mapping.description?.[0] ?? 0, Number(e.target.value)],
                      })
                    }
                  >
                    <option value="">None</option>
                    {columnOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset>
                <legend className="text-[11px] text-zinc-400 mb-1.5">Amounts are in</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: false, label: "One column" },
                    { value: true, label: "Debit + credit" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        updateMapping(
                          opt.value
                            ? { amount: null, debit: mapping.debit ?? 2, credit: mapping.credit ?? 3 }
                            : { amount: mapping.amount ?? 2, debit: null, credit: null }
                        )
                      }
                      className={`h-10 rounded-lg border text-xs font-medium cursor-pointer ${
                        usesDebitCredit === opt.value
                          ? "bg-white/[0.08] border-white/25 text-zinc-100"
                          : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {usesDebitCredit ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "debit", label: "Money out (debit)" },
                    { key: "credit", label: "Money in (credit)" },
                  ].map((f) => (
                    <label key={f.key} className="block min-w-0">
                      <span className="block text-[11px] text-zinc-400 mb-1">{f.label}</span>
                      <select
                        className={selectClass}
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => updateMapping({ [f.key]: Number(e.target.value) })}
                      >
                        {columnOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className="block text-[11px] text-zinc-400 mb-1">Amount</span>
                    <select
                      className={selectClass}
                      value={mapping.amount ?? ""}
                      onChange={(e) => updateMapping({ amount: Number(e.target.value) })}
                    >
                      {columnOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="block text-[11px] text-zinc-400 mb-1">Money out shows as</span>
                    <select
                      className={selectClass}
                      value={mapping.outflow || "negative"}
                      onChange={(e) => updateMapping({ outflow: e.target.value })}
                    >
                      <option value="negative">Negative (-12.50)</option>
                      <option value="positive">Positive (12.50)</option>
                    </select>
                  </label>
                </div>
              )}
              <button
                type="button"
                onClick={() => runPreview(file, mapping)}
                disabled={loading || !isMappingComplete(mapping)}
                className="btn-secondary h-10 w-full sm:w-auto px-4 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>{loading ? "Reading..." : "Update preview"}</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Preview */}
      {preview && (
        <section>
          <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">4. Preview</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Matched", value: counts.matched, hint: "bills marked paid", tone: "text-emerald-300" },
              { label: "New", value: counts.new, hint: "will be added", tone: "text-sky-300" },
              { label: "Skipped", value: counts.skipped, hint: "not imported", tone: "text-zinc-300" },
            ].map((c) => (
              <div key={c.label} className="glass-panel px-3 py-2 min-w-0">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{c.label}</p>
                <p className={`text-lg font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
                <p className="text-[10px] text-zinc-500 truncate">{c.hint}</p>
              </div>
            ))}
          </div>
          {preview.invalid?.length > 0 && (
            <p className="text-[11px] text-amber-300/90 mb-3">
              {preview.invalid.length} line{preview.invalid.length === 1 ? "" : "s"} couldn't be read and won't be imported
              (line {preview.invalid[0].line}: {preview.invalid[0].reason}).
            </p>
          )}
          {duplicateCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSkipped((v) => !v)}
              className="inline-flex items-center gap-1.5 h-10 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer mb-1"
            >
              {showSkipped ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>
                {showSkipped ? "Hide" : "Show"} {duplicateCount} already imported
              </span>
            </button>
          )}

          <ul className="glass-panel divide-y divide-white/[0.04] overflow-hidden">
            {visibleRows.length === 0 && (
              <li className="p-6 text-center text-sm text-zinc-400">Everything in this file was imported before.</li>
            )}
            {visibleRows.map((row) => {
              const edit = edits[row.line] || {};
              const outcome = rowOutcome(row, edit);
              const badge = STATUS_BADGES[outcome];
              const isOut = row.direction === "out";
              const canPickCategory = outcome === "new" && isOut;
              return (
                <li key={row.line} className={`px-3 py-2.5 ${outcome === "skip" ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-100 break-words line-clamp-2">{row.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-zinc-500 tabular-nums">{formatShortDate(row.date)}</span>
                        <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded ${badge.className}`}>
                          {row.status === "duplicate" ? (row.inTrash ? "In Trash" : "Already imported") : badge.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium tabular-nums whitespace-nowrap shrink-0 ${
                        isOut ? "text-zinc-200" : "text-emerald-400"
                      }`}
                    >
                      {isOut ? "-" : "+"}
                      {formatCurrency(row.amount)}
                    </span>
                  </div>

                  {row.status === "match" && (
                    <p className={`text-[11px] mt-1 ${edit.unmatch ? "text-zinc-500 line-through" : "text-emerald-300/90"}`}>
                      Marks “{row.match.title}” ({formatShortDate(row.match.date)}) paid
                    </p>
                  )}

                  {row.status !== "duplicate" && (
                    <div className="flex items-center gap-2 mt-2">
                      {canPickCategory ? (
                        <select
                          aria-label={`Category for ${row.description}`}
                          className={`${selectClass} flex-1`}
                          value={edit.category || row.category || "Other"}
                          onChange={(e) => setEdit(row.line, { category: e.target.value })}
                        >
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="flex-1 min-w-0 text-[11px] text-zinc-500 truncate">
                          {outcome === "new" ? row.category : outcome === "match" ? row.match.category : ""}
                        </span>
                      )}
                      {row.status === "match" && !edit.skip && (
                        <button
                          type="button"
                          onClick={() => setEdit(row.line, { unmatch: !edit.unmatch })}
                          className="btn-secondary h-10 px-2.5 shrink-0"
                          title={edit.unmatch ? "Mark the bill paid instead" : "Add as a new row; the bill stays unpaid"}
                        >
                          {edit.unmatch ? <Link2 size={13} /> : <Link2Off size={13} />}
                          <span>{edit.unmatch ? "Match" : "Unmatch"}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEdit(row.line, { skip: !edit.skip })}
                        className="btn-secondary h-10 px-2.5 shrink-0"
                      >
                        <span>{edit.skip ? "Include" : "Skip"}</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {preview && (
        <div className="fixed inset-x-4 bottom-[76px] md:bottom-6 z-30 max-w-lg mx-auto">
          <div className="flex items-center gap-3 bg-zinc-900/95 backdrop-blur-md border border-white/[0.12] rounded-2xl p-2 pl-4 shadow-2xl">
            <p className="flex-1 min-w-0 text-xs text-zinc-300 truncate">{importCountsLine(counts)}</p>
            <button
              type="button"
              onClick={commit}
              disabled={committing || toImport === 0}
              className="btn-primary h-10 px-4 shrink-0 disabled:opacity-50"
            >
              <ListChecks size={14} />
              <span>{committing ? "Importing..." : toImport === 0 ? "Nothing to import" : `Import ${toImport}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
