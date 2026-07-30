import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const NavigationContext = createContext(null);

function normalize(item) {
  return {
    ...item,
    navKey: item.navKey ?? item.nav_key ?? "",
    enabled: item.enabled === true || item.enabled === 1 || item.enabled === "1",
    authRequired: item.authRequired ?? item.auth_required ?? false,
  };
}

export function NavigationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback((silent = false) => {
    let active = true;
    // Background refreshes must not replace the whole application with the
    // route loading screen. Keep the existing navigation state visible while
    // the latest settings are fetched.
    if (!silent) setLoading(true);
    api.get("/api/navigation")
      .then((response) => {
        if (!active) return;
        const payload = response.data?.data ?? response.data ?? [];
        setItems(Array.isArray(payload) ? payload.map(normalize) : []);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => refresh(), [refresh]);

  useEffect(() => {
    const handleUpdate = () => refresh(true);
    window.addEventListener("navigation-settings-updated", handleUpdate);
    const timer = window.setInterval(() => refresh(true), 30000);
    return () => {
      window.removeEventListener("navigation-settings-updated", handleUpdate);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo(() => {
    const isEnabled = (navKey) => !loading && !failed && items.some((item) => item.navKey === navKey && item.enabled);
    const itemsFor = (location) => items.filter((item) => item.location === location && item.enabled);
    return { items, loading, failed, refresh, isEnabled, itemsFor };
  }, [failed, items, loading, refresh]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useNavigation must be used within NavigationProvider");
  return value;
}
