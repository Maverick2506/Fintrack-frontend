import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";
import toast from "react-hot-toast";

const useIdleTimeout = (timeout = 1200000) => {
  // 20 minutes in milliseconds
  const navigate = useNavigate();
  const timeoutId = useRef(null);

  const resetTimer = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(() => {
      toast.error("You've been logged out due to inactivity.");
      logout();
      navigate("/login");
      window.location.reload();
    }, timeout);
  };

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const eventListener = () => resetTimer();

    // Set up event listeners
    events.forEach((event) => window.addEventListener(event, eventListener));
    // Initialize the timer
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach((event) =>
        window.removeEventListener(event, eventListener)
      );
    };
  }, [navigate, timeout]);

  return null; // This hook doesn't need to return anything
};

export default useIdleTimeout;
