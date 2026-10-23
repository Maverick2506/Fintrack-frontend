import React, { useState } from "react";
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
} from "lucide-react";
import { logout } from "../../utils/auth";
import { openAskFinTrack } from "../../utils/askFinTrack";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/reports", label: "Analytics", icon: BarChart3 },
  { to: "/debts", label: "Debts", icon: Landmark },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/credit-cards", label: "Cards", icon: CreditCard },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/ledger", label: "Ledger", icon: ReceiptText },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isMoreActive = [
    "/savings",
    "/credit-cards",
    "/subscriptions",
    "/quick",
  ].includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/login");
    window.location.reload();
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

          {/* Desktop & Tablet Navigation Links */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
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
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/quick"
              className="inline-flex items-center gap-1 px-2.5 h-10 md:h-auto md:py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              title="Quick Add (Natural Language Entry)"
            >
              <Zap size={13} />
              <span>Quick</span>
            </NavLink>

            {/* Ask FinTrack on phones; desktop opens it from the Overview card */}
            <button
              type="button"
              onClick={openAskFinTrack}
              title="Ask FinTrack"
              className="md:hidden inline-flex items-center gap-1 px-2.5 h-10 rounded-lg text-xs font-semibold text-zinc-200 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Ask</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 px-2.5 h-10 md:h-auto md:py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={14} strokeWidth={1.75} />
              <span className="hidden lg:inline">Sign out</span>
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
          <div className="relative z-10 bg-zinc-950 border-t border-white/[0.1] rounded-t-2xl p-5 shadow-2xl space-y-4 max-w-lg w-full mx-auto">
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
              {[
                {
                  to: "/savings",
                  label: "Savings Goals",
                  icon: PiggyBank,
                  desc: "Track emergency fund & investments",
                },
                {
                  to: "/credit-cards",
                  label: "Credit Cards",
                  icon: CreditCard,
                  desc: "Statement balances & due dates",
                },
                {
                  to: "/subscriptions",
                  label: "Subscriptions",
                  icon: Repeat,
                  desc: "Recurring bills & services",
                },
                {
                  to: "/quick",
                  label: "Quick Add",
                  icon: Zap,
                  desc: "Natural language transaction entry",
                },
              ].map((item) => {
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
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-zinc-200">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {item.desc}
                      </span>
                    </div>
                  </NavLink>
                );
              })}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
