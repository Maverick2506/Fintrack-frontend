import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  LayoutGrid,
  Copy,
  RefreshCw,
  EyeOff,
  Zap,
  Share2,
  Smartphone,
  BarChart3,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import {
  kwgtFormula,
  WIDGET_FORMULAS,
  SLOT_NOTE,
  SUGGESTED_REFRESH_MINUTES,
} from "../utils/widgetSetup";

const copyText = async (text, what) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Couldn't copy. Long-press the text to select it instead.");
  }
};

const CopyButton = ({ text, what, label = "Copy" }) => (
  <button
    type="button"
    onClick={() => copyText(text, what)}
    aria-label={`Copy ${what}`}
    className="btn-secondary min-h-10 min-w-10 px-3 shrink-0"
  >
    <Copy size={13} />
    {label && <span>{label}</span>}
  </button>
);

const Section = ({ icon: Icon, title, children }) => (
  <section className="glass-panel p-4 sm:p-5 min-w-0">
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-zinc-400 shrink-0" />
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
    </div>
    {children}
  </section>
);

const Steps = ({ children }) => (
  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-zinc-300 marker:text-zinc-500">{children}</ol>
);

// Widgets: a read-only feed for KWGT home-screen widgets, the Quick Add shortcut and Share -> FinTrack
const WidgetsPage = () => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const { data: config, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["widgetConfig"],
    queryFn: () => dashboardService.fetchWidgetConfig(),
  });
  const url = config?.widgetUrl || "";
  const hideAmounts = Boolean(config?.hideAmounts);

  const regenerate = async () => {
    if (
      !window.confirm(
        "Make a new widget link? The old one stops working right away, so you'll need to paste the new link into KWGT."
      )
    ) {
      return;
    }
    setBusy("regenerate");
    try {
      const res = await dashboardService.regenerateWidgetKey();
      if (res?.widgetUrl) queryClient.setQueryData(["widgetConfig"], res);
    } catch (err) {
      console.error("Widget key regeneration failed:", err);
    } finally {
      setBusy(null);
    }
  };

  const toggleHide = async () => {
    setBusy("hide");
    try {
      const res = await dashboardService.setWidgetHideAmounts(!hideAmounts);
      queryClient.setQueryData(["widgetConfig"], (prev) => (prev ? { ...prev, hideAmounts: res.hideAmounts } : prev));
    } catch (err) {
      console.error("Widget setting failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-24">
      <div className="flex items-center gap-2 min-w-0">
        <LayoutGrid size={18} className="text-zinc-400 shrink-0" />
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Widgets</h1>
      </div>
      <p className="text-xs text-zinc-500 mt-1 mb-6">
        Put Safe to Spend, your next bills, cards and goals on your Android home screen with KWGT, and add
        expenses with the Quick Add shortcut or Share → FinTrack.
      </p>

      <div className="space-y-4">
        <Section icon={Smartphone} title="Your widget link">
          {isLoading ? (
            <p className="text-xs text-zinc-500">Loading your widget link...</p>
          ) : isError ? (
            <div className="space-y-2">
              <p className="text-xs text-rose-400">
                {error?.response?.data?.error || "Couldn't load your widget link."}
              </p>
              <button type="button" onClick={() => refetch()} className="btn-secondary min-h-10 px-3">
                Retry
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mb-2">
                Anyone with this link can see what the widget shows (no transaction history). Keep it to yourself.
              </p>
              <div className="flex items-start gap-2 min-w-0">
                <code className="flex-1 min-w-0 break-all rounded-lg bg-zinc-950 border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-200 font-mono">
                  {url}
                </code>
                <CopyButton text={url} what="Widget link" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 flex items-center gap-1.5">
                    <EyeOff size={14} className="text-zinc-500 shrink-0" />
                    Hide amounts
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    The widget shows words like “On track” or “Due today” instead of dollar amounts. Bars still work.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideAmounts}
                  aria-label="Hide amounts on the widget"
                  onClick={toggleHide}
                  disabled={busy !== null}
                  className="shrink-0 min-h-10 min-w-12 flex items-center justify-center disabled:opacity-50"
                >
                  <span
                    className={`w-11 h-6 rounded-full border transition-colors flex items-center px-0.5 ${
                      hideAmounts ? "bg-emerald-500/80 border-emerald-400/60" : "bg-zinc-800 border-white/10"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-zinc-100 transition-transform ${hideAmounts ? "translate-x-5" : ""}`}
                    />
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={regenerate}
                disabled={busy !== null}
                className="btn-secondary min-h-10 px-3 mt-4 disabled:opacity-50"
              >
                <RefreshCw size={13} className={busy === "regenerate" ? "animate-spin" : ""} />
                <span>Regenerate key</span>
              </button>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Use this if the link got out. The old link stops working at once.
              </p>
            </>
          )}
        </Section>

        <Section icon={LayoutGrid} title="Set up a KWGT widget">
          <Steps>
            <li>Install <span className="text-zinc-100">KWGT Kustom Widget Maker</span> from the Play Store.</li>
            <li>Long-press an empty spot on your home screen, tap <span className="text-zinc-100">Widgets</span>, find KWGT and drag a size (4×2 works well) onto the screen.</li>
            <li>Tap the new empty widget to open KWGT, then tap <span className="text-zinc-100">Create</span>.</li>
            <li>Tap <span className="text-zinc-100">+</span> and add a <span className="text-zinc-100">Text</span> item. Tap its Text field, then paste one of the formulas below.</li>
            <li>For a bar, add a <span className="text-zinc-100">Progress</span> item, set its maximum to 100 and paste a “bar” formula as its value.</li>
            <li>Tap the save icon at the top. The widget fills in once KWGT downloads the feed.</li>
          </Steps>
          <p className="text-[11px] text-zinc-500 mt-3">
            Suggested refresh: every {SUGGESTED_REFRESH_MINUTES} minutes. KWGT downloads the link once for all
            formulas that use it, and the feed allows 30 downloads an hour. If you regenerate the key, paste the new
            link into each formula (or keep the link in one KWGT Global and use <code className="font-mono text-zinc-300">gv(url)</code>).
          </p>
        </Section>

        <Section icon={BarChart3} title="Formulas">
          <p className="text-[11px] text-zinc-500 mb-3">{SLOT_NOTE}</p>
          {url ? (
            <ul className="space-y-2">
              {WIDGET_FORMULAS.map((f) => {
                const formula = kwgtFormula(url, f.field);
                return (
                  <li key={f.field} className="rounded-xl border border-white/[0.06] bg-zinc-950/50 p-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200">
                          {f.label}
                          {f.bar && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-300">
                              bar
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          <span className="font-mono">.{f.field}</span> · e.g. {f.example}
                        </p>
                      </div>
                      <CopyButton text={formula} what={`${f.label} formula`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">The formulas appear once your widget link loads.</p>
          )}
        </Section>

        <Section icon={Zap} title="Quick Add from the home screen">
          <Steps>
            <li>Long-press the FinTrack icon on your home screen or app drawer.</li>
            <li>Drag <span className="text-zinc-100">Quick Add</span> from the menu that pops up onto your home screen.</li>
            <li>Tap it any time to type an expense like <code className="font-mono text-zinc-300">23.40 lunch visa</code>.</li>
          </Steps>
        </Section>

        <Section icon={Share2} title="Share → FinTrack">
          <Steps>
            <li>In your bank’s text message, email or app, select the purchase alert text and tap <span className="text-zinc-100">Share</span>.</li>
            <li>Pick <span className="text-zinc-100">FinTrack</span>. Quick Add opens with the amount, payee and card filled in.</li>
            <li>Check it and tap Save. Nothing is saved until you do.</li>
          </Steps>
          <p className="text-[11px] text-zinc-500 mt-3">
            Put the last 4 digits in each card’s name (e.g. “TD Visa 1234”) so a share picks the right card.
            Android can’t share a notification itself. Copy its text and paste it into Quick Add instead; it’s
            filled in the same way. If FinTrack isn’t in the Share list, remove FinTrack from your home screen and
            install it again from Chrome so Android picks up the new share option.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default WidgetsPage;
