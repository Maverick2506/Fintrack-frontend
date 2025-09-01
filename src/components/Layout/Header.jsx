import React from "react";

const Header = () => {
  const currentDate = new Date();
  const month = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-white">FinTrack Dashboard</h1>
      <p className="text-gray-400">
        {month} {year}
      </p>
    </header>
  );
};

export default Header;
