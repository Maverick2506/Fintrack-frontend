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
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter">
            F
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            FinTrack
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <LogOut size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
