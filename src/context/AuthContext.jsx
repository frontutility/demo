import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const initialUser = {
  loggedIn: false,
  can_create_text_post: true,
  canCreateTextPost: true,
  can_create_poll_post: true,
  canCreatePollPost: true,
  can_create_image_post: false,
  canCreateImagePost: false,
  can_create_image_text_post: false,
  canCreateImageTextPost: false,
};

function normalizeSessionUser(user) {
  if (!user || typeof user !== "object") return user;
  const canCreateTextPost = [1, "1", true, "true", "yes", "on"].includes(
    user.can_create_text_post ?? user.canCreateTextPost ?? true
  );
  const canCreatePollPost = [1, "1", true, "true", "yes", "on"].includes(
    user.can_create_poll_post ?? user.canCreatePollPost ?? true
  );
  const canCreateImagePost = [1, "1", true, "true", "yes", "on"].includes(
    user.can_create_image_post ?? user.canCreateImagePost ?? false
  );
  const canCreateImageTextPost = [1, "1", true, "true", "yes", "on"].includes(
    user.can_create_image_text_post ?? user.canCreateImageTextPost ?? false
  );
  return {
    ...user,
    can_create_text_post: canCreateTextPost,
    canCreateTextPost,
    can_create_poll_post: canCreatePollPost,
    canCreatePollPost,
    can_create_image_post: canCreateImagePost,
    canCreateImagePost,
    can_create_image_text_post: canCreateImageTextPost,
    canCreateImageTextPost,
  };
}

function safeParseUser(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Prevent an older bootstrap /me request from undoing a login that finished
  // while that request was still in flight.
  const authOperationRef = useRef(0);

  async function refreshUser() {
    const operation = ++authOperationRef.current;
    try {
      const res = await api.get("/api/auth/me");
      const payload = res.data ?? {};
      const nextUser = payload.data?.user ?? payload.user ?? null;
      if (operation !== authOperationRef.current) return null;
      if (nextUser && typeof nextUser === "object" && Number(nextUser.id || 0) > 0) {
        const normalizedUser = normalizeSessionUser(nextUser);
        try {
          localStorage.setItem("user", JSON.stringify(normalizedUser));
        } catch (e) { }
        setUser({ ...initialUser, ...normalizedUser, loggedIn: true });
        return normalizedUser;
      }
      localStorage.removeItem("user");
      setUser(initialUser);
      return null;
    } catch (error) {
      if (operation !== authOperationRef.current) return null;
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) { }
      setUser(initialUser);
      return null;
    }

    return null;
  }

  async function refreshNotifications() {
    try {
      const res = await api.get("/api/notifications/unread-count");
      const count = res.data?.count ?? res.data?.data?.count ?? 0;
      setUnreadCount(Number(count));
      return Number(count);
    } catch {
      return 0;
    }
  }

  useEffect(() => {
    const storedUser = safeParseUser(localStorage.getItem("user"));
    refreshUser().finally(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (user.loggedIn) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user.loggedIn]);

  const value = useMemo(
    () => ({
      user,
      ready,
      login: (tokenOrNextUser = {}, maybeNextUser = {}) => {
        authOperationRef.current += 1;
        // login(token, user) or login(user)
        if (typeof tokenOrNextUser === "string") {
          try {
            const normalizedUser = normalizeSessionUser(maybeNextUser || {});
            localStorage.setItem("user", JSON.stringify(normalizedUser));
          } catch (e) { }
          const nextUser = normalizeSessionUser(maybeNextUser || {});
          setUser({ ...initialUser, ...nextUser, loggedIn: true });
        } else {
          const nextUser = normalizeSessionUser(tokenOrNextUser || {});
          try {
            localStorage.setItem("user", JSON.stringify(nextUser));
          } catch (e) { }
          setUser({ ...initialUser, ...nextUser, loggedIn: true });
        }
      },
      logout: () => {
        authOperationRef.current += 1;
        try {
          localStorage.removeItem("user");
        } catch (e) { }
        setUser(initialUser);
      },
      refreshUser,
      setUser,
      unreadCount,
      refreshNotifications,
    }),
    [user, ready, refreshUser, unreadCount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
