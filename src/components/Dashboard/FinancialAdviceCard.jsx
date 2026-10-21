import React, { useState } from "react";
import { formatCurrency } from "../../utils/formatUtils";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const renderMarkdown = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-zinc-100 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const FinancialAdviceCard = ({
  isMobileExpandedInitial = false,
  advice,
  structured,
  onGetAdvice,
  isLoading,
  onOpenGemModal,
}) => {
  const data = structured || (typeof advice === "object" ? advice : null);
  const rawAdviceText = typeof advice === "string" ? advice : data?.summary || "";
  const [isMobileExpanded, setIsMobileExpanded] = useState(isMobileExpandedInitial);

  const healthStatus = data?.healthStatus || "healthy";
  const badgeStyles = {
    healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    caution: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    warning: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }[healthStatus] || "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  const BadgeIcon = {
    healthy: CheckCircle2,
    caution: AlertTriangle,
    warning: AlertCircle,
  }[healthStatus] || CheckCircle2;

  return (
    <>
      {/* Mobile Collapsed Single Button / Bar (M5) */}
      <div className="sm:hidden glass-panel p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-zinc-200 truncate">AI Financial Advisor</h3>
            <p className="text-[10px] text-zinc-500 truncate">
              {data?.headline || "Personalized cash-flow & savings insights"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!rawAdviceText && !data) {
              onGetAdvice();
            }
            setIsMobileExpanded(!isMobileExpanded);
          }}
          disabled={isLoading}
          className="btn-primary !py-1.5 !px-2.5 !text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <Sparkles size={11} />
          <span>{isLoading ? "Analyzing..." : isMobileExpanded ? "Close" : "✨ Get AI insight"}</span>
        </button>
      </div>

      <div className={`glass-panel p-6 ${isMobileExpanded ? "block" : "hidden sm:block"}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-emerald-400" />
          <span>AI Financial Advisor</span>
        </h2>
        <div className="flex items-center gap-2">
          {onOpenGemModal && (
            <button
              onClick={onOpenGemModal}
              className="btn-secondary !py-1 !px-2.5 !text-[11px] flex items-center gap-1.5 text-zinc-300 hover:text-white"
              title="Link live FinTrack data into your Google Gemini app / Custom Gem"
            >
              <Sparkles size={11} className="text-indigo-400" />
              <span>Gemini Gem</span>
            </button>
          )}
          <button
            onClick={onGetAdvice}
            disabled={isLoading}
            className="btn-secondary !py-1 !px-2.5 !text-[11px] flex items-center gap-1"
          >
            <RefreshCw
              size={11}
              className={isLoading ? "animate-spin text-zinc-400" : ""}
            />
            <span>{isLoading ? "Analyzing..." : rawAdviceText ? "Refresh" : "Analyze"}</span>
          </button>
        </div>
      </div>

      {rawAdviceText || data ? (
        <div className="space-y-4">
          {/* Status Header Badge & Headline */}
          {data?.headline && (
            <div className="flex items-start justify-between gap-3 bg-zinc-950/80 p-3.5 rounded-xl border border-white/[0.06]">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-1.5 ${badgeStyles}`}
                >
                  <BadgeIcon size={11} />
                  <span className="capitalize">{healthStatus} Float</span>
                </span>
                <p className="text-xs font-medium text-zinc-200 leading-snug">
                  {data.headline}
                </p>
              </div>
              {data.floatAmount !== undefined && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                    Float
                  </span>
                  <span
                    className={`text-sm font-semibold tracking-tight font-mono ${
                      data.floatAmount >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(data.floatAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Core Summary */}
          <div className="bg-zinc-950/60 p-3.5 rounded-xl text-xs text-zinc-300 leading-relaxed border border-white/[0.04]">
            {rawAdviceText.split("\n").map((line, i) => (
              <p key={i} className={i > 0 ? "mt-2" : ""}>
                {renderMarkdown(line)}
              </p>
            ))}
          </div>

          {/* Tactical Action Points */}
          {Array.isArray(data?.tacticalActions) && data.tacticalActions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block px-1">
                Top Tactical Actions
              </span>
              <div className="space-y-1.5">
                {data.tacticalActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-zinc-900/60 p-2.5 rounded-lg border border-white/[0.04] text-xs text-zinc-300"
                  >
                    <ArrowRight
                      size={13}
                      className="text-emerald-400 shrink-0 mt-0.5"
                    />
                    <span className="leading-snug">{renderMarkdown(action)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spending Alert if Present */}
          {data?.spendingAlert && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs text-amber-300">
              <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{data.spendingAlert}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 rounded-xl border border-dashed border-white/[0.06] text-center">
          <p className="text-zinc-500 text-xs font-medium mb-3">
            Generate an AI-powered cash-flow projection, float analysis, and personalized savings advice.
          </p>
          <button
            onClick={onGetAdvice}
            disabled={isLoading}
            className="btn-primary !py-1.5 !px-3.5 !text-xs inline-flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>Generate Snapshot Insight</span>
          </button>
        </div>
      )}
    </div>
    </>
  );
};

export default FinancialAdviceCard;
