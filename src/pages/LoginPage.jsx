import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, devLogin, isLocalHost } from "../utils/auth";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const isLocal = isLocalHost();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(password);
      navigate("/");
      window.location.reload();
    } catch (error) {
      toast.error("Invalid password.");
    }
  };

  const handleDevBypass = async () => {
    try {
      await devLogin();
      toast.success("Dev bypass activated!");
      navigate("/");
      window.location.reload();
    } catch (error) {
      toast.error("Dev bypass failed.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
      <div className="glass-panel p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-sm mb-3">
            F
          </div>
          <h1
            onDoubleClick={isLocal ? handleDevBypass : undefined}
            title={isLocal ? "Double-click for local dev bypass" : undefined}
            className="text-xl font-semibold text-zinc-100 text-center select-none cursor-pointer tracking-tight"
          >
            Welcome back, Maverick
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Enter your passcode to unlock FinTrack
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-medium text-zinc-400 mb-1.5"
              htmlFor="password"
            >
              Passcode
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="minimal-input"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full !py-2.5">
            Continue
          </button>
          {isLocal && (
            <button
              type="button"
              onClick={handleDevBypass}
              className="btn-secondary w-full !py-2"
            >
              ⚡ Quick Dev Bypass (Local Only)
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
