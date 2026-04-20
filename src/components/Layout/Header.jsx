import React from "react";

const Header = () => {
  const currentDate = new Date();
  const month = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  return (
    <header className="mb-10 mt-6 flex justify-between items-center bg-black/10 backdrop-blur-md border border-white/5 p-4 rounded-2xl shadow-xl shadow-black/20">
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">FinTrack.</h1>
        <p className="text-sm font-semibold tracking-widest text-emerald-500/80 uppercase mt-1">
          {month} {year}
        </p>
      </div>
    </header>
  );
};

export default Header;
