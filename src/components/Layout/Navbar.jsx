import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";

const Navbar = () => {
  const navigate = useNavigate();
  const linkClass =
    "px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClass = "bg-gray-700 text-white";
  const inactiveLinkClass = "text-gray-300 hover:bg-gray-800 hover:text-white";

  const handleLogout = () => {
    logout();
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav className="bg-gray-900 p-4 flex justify-center sticky top-0 z-10">
      <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          Reports
        </NavLink>
        <NavLink
          to="/debts"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          Debts
        </NavLink>
        <NavLink
          to="/savings"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
          }
        >
          Savings
        </NavLink>
        <button
          onClick={handleLogout}
          className={`${linkClass} ${inactiveLinkClass}`}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
