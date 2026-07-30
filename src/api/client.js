const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function resolveUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(resolveUrl(path), {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload.message || payload.error || response.statusText
        : response.statusText;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return payload;
}

export function unwrapData(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return payload;

  return (
    payload.data ??
    payload.items ??
    payload.result ??
    payload.page ??
    payload.user ??
    payload.users ??
    payload.posts ??
    payload.villages ??
    payload.postCategories ??
    payload.categories ??
    payload.helpCenter ??
    payload.cms ??
    payload.pages ??
    payload.reports ??
    payload.summary ??
    payload
  );
}
