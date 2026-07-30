import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { unwrapData } from "./client";

export function useApiResource(path, { initialData = null, transform = (value) => value, deps = [] } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const transformRef = useRef(transform);
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    if (!path) {
      setData(initialDataRef.current);
      setLoading(false);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    api
      .get(path, { signal: controller.signal })
      .then((response) => {
        const payload = response.data;
        const next = transformRef.current(unwrapData(payload));
        setData(next);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setError(err.message || "Failed to load data");
        setData(initialDataRef.current);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [path, refreshToken, ...deps]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshToken((value) => value + 1),
    refetch: () => setRefreshToken((value) => value + 1),
  };
}
