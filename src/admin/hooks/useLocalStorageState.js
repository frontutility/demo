import { useEffect, useState } from "react";

export function useLocalStorageState(key, fallbackValue) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return fallbackValue;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

