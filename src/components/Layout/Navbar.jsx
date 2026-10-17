import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  PiggyBank,
  CreditCard,
  ReceiptText,
  LogOut,
} from "lucide-react";
import { logout } from "../../utils/auth";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/reports", label: "Analytics", icon: BarChart3 },
  { to: "/debts", label: "Debts", icon: Landmark },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/credit-cards", label: "Cards", icon: CreditCard },
  { to: "/ledger", label: "Ledger", icon: ReceiptText },
];

const Navbar = () => {
  const navigate = useNavigate();

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
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-white/[0.08] text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`
                }
              >
                <Icon size={14} strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={14} strokeWidth={1.75} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock (< 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-zinc-950/95 backdrop-blur-lg px-2 py-1.5 grid grid-cols-6 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-zinc-100 bg-white/[0.08]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`
            }
          >
            <Icon size={15} strokeWidth={1.75} />
            <span className="truncate max-w-full">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
