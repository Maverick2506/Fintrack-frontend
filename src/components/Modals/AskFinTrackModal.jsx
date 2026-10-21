import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  HelpCircle,
  TrendingDown,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import dashboardService from "../../services/dashboardService";
import useEscapeClose from "../../hooks/useEscapeClose";

const SUGGESTED_PROMPTS = [
  {
    icon: HelpCircle,
    label: "Can I afford $300 before payday?",
    prompt: "Can I afford to spend $300 right now from checking before my next paycheque?",
  },
  {
    icon: TrendingDown,
    label: "Where did my money go this month?",
    prompt: "Break down where my money went this month and highlight any unusual spending.",
  },
  {
    icon: CreditCard,
    label: "Which debt should I pay extra on?",
    prompt: "Which credit card or debt should I prioritize paying down first, and why?",
  },
  {
    icon: ShieldCheck,
    label: "Safe to Spend & Buffer check",
    prompt: "How safe is my cash buffer over the next 60 days? Am I at risk of dipping below my buffer?",
  },
];

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Basic bold replacement
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const renderedLine = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="text-zinc-100 font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      return (
        <li key={idx} className="ml-4 list-disc text-zinc-300">
          {renderedLine}
        </li>
      );
    }
    return (
      <p key={idx} className={idx > 0 ? "mt-2" : ""}>
        {renderedLine}
      </p>
    );
  });
};

const AskFinTrackModal = ({ isOpen, onClose }) => {
  useEscapeClose(isOpen, onClose);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (messageText) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const newHistory = [
      ...messages,
      { role: "user", text: textToSend },
    ];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      // Resilient history slicing: drop error bubbles, take last 8, cap at 4000 chars (C1)
      const apiHistory = messages
        .filter((m) => !m.isError)
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));

      const res = await dashboardService.chatAdvisor(textToSend, apiHistory);
      const replyText = res?.reply || "I didn't receive a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "model", text: replyText },
      ]);
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        "Failed to reach AI financial advisor. Please check your connection and try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `⚠️ **Error:** ${errMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[500px] h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <span>Ask FinTrack</span>
                <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  Live Tools
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500">
                Co-pilot with live 60-day forecast & simulation math
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-b from-emerald-500/10 to-transparent p-4 rounded-xl border border-emerald-500/20 text-xs text-zinc-300">
                <p className="font-medium text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Personal Financial Intelligence</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Ask questions about your affordability, safe float, debts, or upcoming bills.
                  FinTrack uses live simulation tools to calculate mathematically verified answers.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block px-1">
                  Suggested Prompts
                </span>
                <div className="grid gap-2">
                  {SUGGESTED_PROMPTS.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.04] hover:border-emerald-500/30 text-xs text-zinc-300 transition-all flex items-center gap-2.5 group cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 shrink-0 transition-colors">
                          <Icon size={13} />
                        </div>
                        <span className="flex-1 text-zinc-300 group-hover:text-zinc-100 font-medium">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-zinc-900/90 border border-white/[0.06] text-zinc-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  {m.role === "user" ? m.text : renderMarkdown(m.text)}
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 px-1">
                  {m.role === "user" ? "You" : "FinTrack Advisor"}
                </span>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-3 bg-zinc-900/50 rounded-xl border border-white/[0.04] animate-pulse">
              <Loader2 size={14} className="animate-spin text-emerald-400" />
              <span>Analyzing live cashflow & running mathematical simulation...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div className="p-3 border-t border-white/[0.08] bg-zinc-900/50 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about spending, affordability, debts..."
              disabled={isLoading}
              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary !py-2.5 !px-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="text-[10px] text-center text-zinc-600">
            Session history is kept only in memory and cleared on close.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AskFinTrackModal;
