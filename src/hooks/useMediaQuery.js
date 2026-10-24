import { useSyncExternalStore } from "react";

// True while the CSS media query matches, e.g. "(pointer: coarse)".
const useMediaQuery = (query) =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );

export default useMediaQuery;
