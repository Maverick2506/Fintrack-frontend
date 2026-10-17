import { useEffect, useRef } from "react";
import { logout, isLoggedIn, touchLastActive, IDLE_TIMEOUT_MS } from "../utils/auth";
import toast from "react-hot-toast";

const useIdleTimeout = (timeout = IDLE_TIMEOUT_MS, enabled = true) => {
  const timeoutId = useRef(null);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const triggerLogout = () => {
      toast.error("You've been logged out due to inactivity.");
      logout();
      window.location.replace("/login");
    };

    const checkOrResetTimer = (isUserActivity = false) => {
      // First check if session/idle already expired while tab was backgrounded or asleep
      if (!isLoggedIn()) {
        triggerLogout();
        return;
      }

      if (isUserActivity) {
        const now = Date.now();
        if (now - lastTouchRef.current > 5000) {
          lastTouchRef.current = now;
          touchLastActive();
        }
      }

      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }

      const lastActive = parseInt(
        localStorage.getItem("fintrack_last_active") || String(Date.now()),
        10
      );
      const remaining = Math.max(0, timeout - (Date.now() - lastActive));

      timeoutId.current = setTimeout(() => {
        triggerLogout();
      }, remaining);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => checkOrResetTimer(true);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkOrResetTimer(false);
      }
    };

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Periodic heartbeat check in case browser throttled setTimeout during sleep
    const intervalId = setInterval(() => checkOrResetTimer(false), 15000);

    checkOrResetTimer(true);

    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      clearInterval(intervalId);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [timeout, enabled]);

  return null;
};

export default useIdleTimeout;
