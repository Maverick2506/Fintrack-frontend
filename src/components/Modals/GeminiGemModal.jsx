import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  FileDown,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Table,
} from "lucide-react";
import dashboardService from "../../services/dashboardService";

const GeminiGemModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("auto"); // "auto" | "manual"
  const [syncMethod, setSyncMethod] = useState("script"); // "script" | "formula"
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await dashboardService.getGeminiLiveConfig();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load Gemini config:", err);
      setLoadError("Unable to load live feed configuration. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFormula = () => {
    if (!config?.sheetFormula) return;
    navigator.clipboard.writeText(config.sheetFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2200);
  };

  const handleCopyScript = () => {
    if (!config?.appsScript) return;
    navigator.clipboard.writeText(config.appsScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  const handleCopyInstructions = () => {
    if (!config?.instructions) return;
    navigator.clipboard.writeText(config.instructions);
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 2200);
  };

  const handleCopyMarkdown = () => {
    if (!config?.markdown) return;
    navigator.clipboard.writeText(config.markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2200);
  };

  const handleDownloadMarkdown = () => {
    if (!config?.markdown) return;
    const blob = new Blob([config.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = config.filename || "fintrack-snapshot.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm("Are you sure? Regenerating will revoke your existing feed key, and you will need to update the formula in your Google Sheet.")) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await dashboardService.regenerateFeedKey();
      if (res?.feedKey) {
        setConfig((prev) => ({
          ...prev,
          feedKey: res.feedKey,
          feedUrl: res.feedUrl,
          sheetFormula: res.sheetFormula,
          appsScript: res.appsScript,
        }));
      }
    } catch (err) {
      console.error("Failed to regenerate key:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Google Gemini Custom Gem Link
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Connect FinTrack directly into your Gemini app chats & Custom Gems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-white/[0.06] bg-zinc-950/30">
          <button
            onClick={() => setActiveTab("auto")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "auto"
                ? "bg-zinc-100 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            }`}
          >
            <RefreshCw size={12} className={activeTab === "auto" ? "text-zinc-950" : "text-zinc-400"} />
            <span>🔄 Automated Live Sync (Google Drive)</span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "manual"
                ? "bg-zinc-100 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            }`}
          >
            <FileText size={12} className={activeTab === "manual" ? "text-zinc-950" : "text-zinc-400"} />
            <span>📄 Manual Snapshot (.md)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-zinc-300">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
              <RefreshCw size={20} className="animate-spin text-indigo-400" />
              <span>Generating live integration payload...</span>
            </div>
          ) : loadError ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center bg-zinc-950/60 rounded-xl border border-white/[0.06] p-6">
              <p className="text-xs text-rose-400 max-w-sm">{loadError}</p>
              <button
                onClick={loadConfig}
                className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : activeTab === "auto" ? (
            <>
              {/* Automated Explanation Banner */}
              <div className="bg-indigo-500/[0.06] border border-indigo-500/20 rounded-xl p-3.5 text-xs space-y-1.5">
                <p className="font-medium text-indigo-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>How Automated Sync Works (Zero File Downloads)</span>
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Google Gemini Custom Gems can link directly to a file in your <strong>Google Drive</strong>. When that file updates, your Gem automatically sees the fresh numbers. By pasting the formula below into a Google Sheet once, FinTrack keeps your Drive synchronized forever!
                </p>
              </div>

              {/* Step 1: Connect FinTrack to Google Sheet */}
              <div className="bg-zinc-950/70 border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-bold">
                      1
                    </span>
                    <span className="text-xs font-semibold text-zinc-200">
                      Sync FinTrack to Google Sheet
                    </span>
                  </div>

                  {/* Sync Method Toggle */}
                  <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-0.5 text-[11px] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSyncMethod("script")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        syncMethod === "script"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      ⚡ Apps Script (Instant On-Open)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMethod("formula")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        syncMethod === "formula"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      📋 Formula (=IMPORTDATA)
                    </button>
                  </div>
                </div>

                {syncMethod === "script" ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        <strong className="text-zinc-300">Recommended:</strong> Bypasses Google&apos;s 2-hour formula cache, refreshes on-open, and adds a manual 1-click refresh menu.
                      </span>
                      <button
                        onClick={handleCopyScript}
                        disabled={!config?.appsScript}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[11px] font-medium text-zinc-200 transition-colors disabled:opacity-40"
                      >
                        {copiedScript ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied Script!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Script</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-zinc-900 border border-white/[0.06] rounded-lg p-2.5 font-mono text-[11px] text-emerald-300 max-h-32 overflow-y-auto select-all whitespace-pre">
                      {config?.appsScript || "Generating live Apps Script..."}
                    </div>

                    <div className="bg-zinc-900/60 rounded-lg p-2.5 border border-white/[0.05] text-[11px] text-zinc-400 space-y-1">
                      <p className="font-semibold text-zinc-300">Quick 20-Second Setup:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-zinc-400">
                        <li>Open your sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">sheets.new</a>, name it <strong className="text-zinc-200">FinTrack Live Data</strong>.</li>
                        <li>Click <strong className="text-zinc-200">Extensions &gt; Apps Script</strong>.</li>
                        <li>Delete any placeholder code, paste the copied script, and click <strong className="text-zinc-200">Save (Disk icon)</strong>.</li>
                        <li>Reload the sheet. It will pull fresh data and add a <strong className="text-zinc-200">FinTrack &gt; 🔄 Refresh Data Now</strong> menu!</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        Zero-code dynamic formula with timestamp cache-buster.
                      </span>
                      <button
                        onClick={handleCopyFormula}
                        disabled={!config?.sheetFormula}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[11px] font-medium text-zinc-200 transition-colors disabled:opacity-40"
                      >
                        {copiedFormula ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied Formula!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Formula</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-zinc-900 border border-white/[0.06] rounded-lg p-2.5 font-mono text-[11px] text-indigo-300 break-all select-all">
                      {config?.sheetFormula || "Generating live formula..."}
                    </div>

                    <div className="text-[10px] text-zinc-400 space-y-1 bg-zinc-900/60 rounded-lg p-2 border border-white/[0.05]">
                      <p>Paste into cell <strong className="text-zinc-200">A1</strong> at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">sheets.new</a>.</p>
                      <p className="text-zinc-500">
                        💡 <strong>To auto-refresh every minute:</strong> In your Google Sheet, go to <strong className="text-zinc-300">File &gt; Settings &gt; Calculation</strong> and set Recalculation to <strong className="text-zinc-300">&apos;On change and every minute&apos;</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: System Instructions Card */}
              <div className="bg-zinc-950/70 border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-bold">
                      2
                    </span>
                    <span className="text-xs font-semibold text-zinc-200">
                      Gemini Gem System Instructions
                    </span>
                  </div>
                  <button
                    onClick={handleCopyInstructions}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[11px] font-medium text-zinc-200 transition-colors"
                  >
                    {copiedInstructions ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied Instructions!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Instructions</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-zinc-900 border border-white/[0.06] rounded-lg p-2.5 max-h-24 overflow-y-auto font-mono text-[11px] text-zinc-400">
                  {config?.instructions}
                </div>
              </div>

              {/* Step 3: Link in Gemini Walkthrough */}
              <div className="bg-zinc-950/70 border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">
                    Create your Gem in Google Gemini (60 Seconds)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.05]">
                    <p className="font-semibold text-zinc-200 mb-1">A. Open Gem Manager</p>
                    <p className="text-zinc-400">
                      Visit <a href="https://gemini.google.com/gems" target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">gemini.google.com/gems <ExternalLink size={10} /></a> and click <strong>New Gem</strong>.
                    </p>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.05]">
                    <p className="font-semibold text-zinc-200 mb-1">B. Paste Instructions</p>
                    <p className="text-zinc-400">
                      Name it <strong>FinTrack Advisor</strong> and paste the copied instructions in the <strong>Instructions</strong> box.
                    </p>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.05]">
                    <p className="font-semibold text-zinc-200 mb-1">C. Attach Google Sheet</p>
                    <p className="text-zinc-400">
                      Under <strong>Knowledge</strong>, click <strong>Google Drive</strong> and select your <strong>FinTrack Live Data</strong> sheet. Hit <strong>Save</strong>!
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-400/90 font-medium">
                  🎉 All set! Open your Gemini app on web, Android, or iPhone and chat with your Gem. It will continuously know your live finances!
                </p>
              </div>

              {/* Security & Key Revocation */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Feed Key: <code className="text-zinc-400">{config?.feedKey ? `${config.feedKey.slice(0, 10)}...` : "••••••••"}</code></span>
                </div>
                <button
                  onClick={handleRegenerateKey}
                  disabled={isRegenerating}
                  className="hover:text-rose-400 underline transition-colors disabled:opacity-50"
                  title="Revoke current token and generate a new one"
                >
                  {isRegenerating ? "Regenerating..." : "Regenerate Secret Key"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Manual Snapshot Tab */}
              <div className="space-y-4">
                <div className="bg-zinc-950/70 border border-white/[0.08] rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-200">
                    Offline Knowledge Document (`.md`)
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    If you prefer not to connect Google Drive, you can download or copy a full Markdown snapshot file to upload directly to your Gem as a one-time knowledge source.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={handleDownloadMarkdown}
                      className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                    >
                      <FileDown size={13} />
                      <span>Download Snapshot (.md)</span>
                    </button>
                    <button
                      onClick={handleCopyMarkdown}
                      className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                    >
                      {copiedMarkdown ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowPreview((p) => !p)}
                      className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 ml-auto"
                    >
                      {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      <span>{showPreview ? "Hide Preview" : "Preview Markdown"}</span>
                    </button>
                  </div>
                </div>

                {showPreview && (
                  <div className="bg-zinc-950 border border-white/[0.08] rounded-xl p-3 max-h-72 overflow-y-auto">
                    <pre className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {config?.markdown}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-zinc-950/60 text-xs">
          <span className="text-zinc-500 text-[11px]">
            FinTrack AI Ecosystem
          </span>
          <button
            onClick={onClose}
            className="btn-secondary !py-1.5 !px-4 !text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiGemModal;
