import { useEffect } from "react";

// Closes a modal on Escape keypress while it is open.
const useEscapeClose = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
};

export default useEscapeClose;
