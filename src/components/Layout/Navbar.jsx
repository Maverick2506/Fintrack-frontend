import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  PiggyBank,
  CreditCard,
  ReceiptText,
  Repeat,
  Zap,
  LogOut,
  MoreHorizontal,
  X,
  Sparkles,
  Trash2,
  Upload,
  Inbox,
  Wand2,
  LayoutGrid,
  ChevronDown,
  ShieldOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { logout } from "../../utils/auth";
import dashboardService from "../../services/dashboardService";
import { openAskFinTrack } from "../../utils/askFinTrack";
import ConfirmDeleteModal from "../Modals/ConfirmDeleteModal";

// The full row from lg (1024px) up. Between md and lg only the core four fit; the rest go in More.
const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, core: true },
  { to: "/reports", label: "Analytics", icon: BarChart3, core: true },
  { to: "/debts", label: "Debts", icon: Landmark, core: true },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/credit-cards", label: "Cards", icon: CreditCard },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/ledger", label: "Ledger", icon: ReceiptText, core: true },
];

// Pages without a tab: the phone More sheet and the tablet/desktop More menu
const secondaryPages = [
  { to: "/savings", label: "Savings Goals", icon: PiggyBank, desc: "Track emergency fund & investments" },
  { to: "/credit-cards", label: "Credit Cards", icon: CreditCard, desc: "Statement balances & due dates" },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat, desc: "Recurring bills & services" },
];
const quickAddPage = { to: "/quick", label: "Quick Add", icon: Zap, desc: "Natural language transaction entry" };
const toolPages = [
  { to: "/widgets", label: "Widgets", icon: LayoutGrid, desc: "Home-screen widget, shortcut and Share" },
  { to: "/import", label: "Import CSV", icon: Upload, desc: "Add transactions from your bank or card" },
  { to: "/review", label: "Review new", icon: Inbox, desc: "Imported rows waiting for a look", reviewBadge: true },
  { to: "/rules", label: "Rules", icon: Wand2, desc: "Categories and cards set by title" },
  { to: "/trash", label: "Trash", icon: Trash2, desc: "Deleted transactions, kept for 30 days" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // tablet/desktop More menu
  const [isSignOutAllOpen, setIsSignOutAllOpen] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const menuRef = useRef(null);
  // Same health check as the Overview card: no Ask button when the server has no AI configured
  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: () => dashboardService.fetchHealth(),
    staleTime: 60000,
  });
  const isAiAvailable = healthData?.ai ?? true;
  // Imported rows waiting in Review new, for the badge on the More sheet
  const { data: reviewRows } = useQuery({
    queryKey: ["reviewInbox"],
    queryFn: () => dashboardService.fetchReviewInbox(),
    staleTime: 60000,
  });
  const reviewCount = Array.isArray(reviewRows) ? reviewRows.length : 0;

  const isSecondaryActive = secondaryPages.some((p) => p.to === location.pathname);
  const isToolActive = [quickAddPage, ...toolPages].some((p) => p.to === location.pathname);
  const isMoreActive = isSecondaryActive || isToolActive;

  // Close the More menu on a page change, an outside click or Escape
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    window.location.reload();
  };

  const openSignOutAll = () => {
    setIsMoreOpen(false);
    setIsMenuOpen(false);
    setIsSignOutAllOpen(true);
  };

  const handleSignOutAll = async () => {
    if (isSigningOutAll) return;
    setIsSigningOutAll(true);
    try {
      await dashboardService.signOutAllDevices();
      handleLogout();
    } catch {
      // The error toast is already shown; stay signed in here
      setIsSigningOutAll(false);
      setIsSignOutAllOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter">
              F
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              FinTrack
            </span>
          </div>

          {/* Desktop & Tablet Navigation Links: core four + More at md, full row + More from lg */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `${item.core ? "inline-flex" : "hidden lg:inline-flex"} items-center gap-1.5 px-2.5 lg:px-3 h-10 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-white/[0.08] text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`
                  }
                >
                  <Icon size={14} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                className={`inline-flex items-center gap-1 px-2.5 lg:px-3 h-10 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isMenuOpen || isToolActive
                    ? "bg-white/[0.08] text-zinc-100"
                    : isSecondaryActive
                      ? "bg-white/[0.08] text-zinc-100 lg:bg-transparent lg:text-zinc-400 lg:hover:text-zinc-200 lg:hover:bg-white/[0.04]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <MoreHorizontal size={14} strokeWidth={1.75} />
                <span>More</span>
                <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-white/[0.1] bg-zinc-950 shadow-2xl p-1.5 z-50"
                >
                  {[...secondaryPages.map((p) => ({ ...p, tabletOnly: true })), ...toolPages].map((item) => {
                    const Icon = item.icon;
                    const badge = item.reviewBadge ? reviewCount : 0;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                          `${item.tabletOnly ? "flex lg:hidden" : "flex"} items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-white/[0.08] text-zinc-100"
                              : "text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100"
                          }`
                        }
                      >
                        <Icon size={14} strokeWidth={1.75} className="shrink-0" />
                        <span className="flex-1 min-w-0 truncate">{item.label}</span>
                        {badge > 0 && (
                          <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300 text-[10px] font-semibold tabular-nums flex items-center justify-center">
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                  <div className="my-1 border-t border-white/[0.06]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openSignOutAll}
                    className="w-full flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <ShieldOff size={14} strokeWidth={1.75} className="shrink-0" />
                    <span>Sign out all devices</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/quick"
              className="inline-flex items-center gap-1 px-2.5 h-10 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              title="Quick Add (Natural Language Entry)"
            >
              <Zap size={13} />
              <span>Quick</span>
            </NavLink>

            {/* Ask FinTrack on phones; desktop opens it from the Overview card */}
            {isAiAvailable && (
            <button
              type="button"
              onClick={openAskFinTrack}
              title="Ask FinTrack"
              className="md:hidden inline-flex items-center gap-1 px-2.5 h-10 rounded-lg text-xs font-semibold text-zinc-200 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Ask</span>
            </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 px-2.5 h-10 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={14} strokeWidth={1.75} />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock (< 768px) - 5 tabs (M14) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-zinc-950/95 backdrop-blur-lg px-2 py-1.5 grid grid-cols-5 gap-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "text-zinc-100 bg-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300"
            }`
          }
        >
          <LayoutDashboard size={17} strokeWidth={1.75} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/ledger"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "text-zinc-100 bg-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300"
            }`
          }
        >
          <ReceiptText size={17} strokeWidth={1.75} />
          <span>Ledger</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "text-zinc-100 bg-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300"
            }`
          }
        >
          <BarChart3 size={17} strokeWidth={1.75} />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/debts"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "text-zinc-100 bg-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300"
            }`
          }
        >
          <Landmark size={17} strokeWidth={1.75} />
          <span>Debts</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
            isMoreActive || isMoreOpen
              ? "text-zinc-100 bg-white/[0.08]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <MoreHorizontal size={17} strokeWidth={1.75} />
          <span>More</span>
        </button>
      </nav>

      {/* "More" Bottom Sheet Modal for Mobile (M14) */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative z-10 bg-zinc-950 border-t border-white/[0.1] rounded-t-2xl p-5 shadow-2xl space-y-4 max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                More Features
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {[...secondaryPages, quickAddPage, ...toolPages].map((item) => {
                const Icon = item.icon;
                const isItemActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-3.5 p-3 rounded-xl transition-all ${
                      isItemActive
                        ? "bg-white/[0.08] text-zinc-100 border border-white/[0.08]"
                        : "hover:bg-white/[0.04] text-zinc-300 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
                      <Icon size={17} />
                    </div>
                    <div className="flex flex-col text-left min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-200">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {item.desc}
                      </span>
                    </div>
                    {item.reviewBadge && reviewCount > 0 && (
                      <span className="shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300 text-[11px] font-semibold tabular-nums flex items-center justify-center">
                        {reviewCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
              {isAiAvailable && (
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  openAskFinTrack();
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] text-zinc-300 border border-transparent transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles size={17} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-zinc-200">Ask FinTrack</span>
                  <span className="text-[11px] text-zinc-500">
                    Ask about your money and plans
                  </span>
                </div>
              </button>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-sm font-medium"
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <LogOut size={16} />
                </div>
                <span>Sign out</span>
              </button>
              <button
                type="button"
                onClick={openSignOutAll}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-sm font-medium"
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldOff size={16} />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span>Sign out all devices</span>
                  <span className="text-[11px] font-normal text-zinc-500">Every phone and browser, this one too</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isSignOutAllOpen}
        onClose={() => !isSigningOutAll && setIsSignOutAllOpen(false)}
        onConfirm={handleSignOutAll}
        title="Sign out all devices?"
        description="Every phone and browser signed in to FinTrack is signed out, this one included. You'll log in again here. Your Gem feed link and home-screen widget keep working."
        confirmLabel={isSigningOutAll ? "Signing out…" : "Sign out everywhere"}
      />
    </>
  );
};

export default Navbar;
