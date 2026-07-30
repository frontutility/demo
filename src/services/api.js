import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let authRedirectInProgress = false;
let csrfTokenPromise = null;

function csrfTokenFromCookie() {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrf_token="));
  return cookie ? decodeURIComponent(cookie.slice("csrf_token=".length)) : "";
}

async function ensureCsrfToken() {
  const existingToken = csrfTokenFromCookie();
  if (existingToken) return existingToken;

  // A user may have a valid session created before the CSRF cookie was added.
  // Share this request so several visible feed cards cannot rotate the token
  // underneath one another.
  if (!csrfTokenPromise) {
    csrfTokenPromise = api.get("/api/auth/csrf-token")
      .then((response) => response?.data?.data?.token || csrfTokenFromCookie())
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

function redirectToLogin(path) {
  if (typeof window === "undefined" || authRedirectInProgress || window.location.pathname === path) return;
  authRedirectInProgress = true;
  window.location.replace(path);
}

// Authentication is carried by the HttpOnly session cookie. Do not read or
// write access tokens from JavaScript-accessible browser storage.
api.interceptors.request.use(async (config) => {
  const method = String(config.method || "get").toUpperCase();
  const requestUrl = String(config.url || "");
  if (requestUrl.includes("/api/admin/")) {
    const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
    if (adminToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  }
  if (typeof document !== "undefined" && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = token;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const requestUrl = String(err?.config?.url || "");
      const isAuthEndpoint =
        requestUrl.includes("/api/auth/login") ||
        requestUrl.includes("/api/auth/email-login") ||
        requestUrl.includes("/api/auth/username-login") ||
        requestUrl.includes("/api/auth/register") ||
        requestUrl.includes("/api/auth/forgot-password") ||
        requestUrl.includes("/api/auth/reset-password");
      try {
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        if (!isAuthEndpoint && pathname.startsWith("/admin")) {
          localStorage.removeItem("adminUser");
          sessionStorage.removeItem("adminUser");
        } else if (!isAuthEndpoint) {
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
        }
      } catch (e) {}
      // Redirect to login only for protected requests
      if (!isAuthEndpoint && typeof window !== "undefined") {
        redirectToLogin(window.location.pathname.startsWith("/admin") ? "/admin/login" : "/login");
      }
    }
    if (status === 403 && typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      const requestUrl = String(err?.config?.url || "");
      if (!requestUrl.includes("/api/admin/auth/login")) {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminUser");
        sessionStorage.removeItem("adminToken");
        redirectToLogin("/admin/login");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
