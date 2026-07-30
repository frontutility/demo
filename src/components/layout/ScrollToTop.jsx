import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop({ behavior = "auto" } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior });
      }
    } catch (err) {
      // Fallback to instant scroll if the smooth option is unsupported
      try {
        window.scrollTo(0, 0);
      } catch (_e) {
        // ignore
      }
    }
  }, [pathname, behavior]);

  return null;
}
