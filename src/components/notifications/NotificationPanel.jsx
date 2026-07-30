import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { FiBell, FiCheck, FiCheckCircle, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const TYPE_LABELS = {
  agree: "Agreed",
  disagree: "Disagreed",
  comment: "Comment",
  comment_reply: "Reply",
  share: "Share",
  follow: "Follow",
  mention: "Mention",
  blue_tick: "Blue Tick",
  system: "System",
  post_reaction: "Reaction",
  report: "Report",
};

const TYPE_COLORS = {
  agree: "#10b981",
  disagree: "#ef4444",
  comment: "#3b82f6",
  comment_reply: "#8b5cf6",
  share: "#f59e0b",
  follow: "#06b6d4",
  mention: "#ec4899",
};

export default function NotificationPanel({ onClose }) {
  const { refreshNotifications } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const [mobileTop, setMobileTop] = useState(56);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const nav = document.querySelector(".navbar");
    if (nav) {
      const updateHeight = () => setMobileTop(nav.offsetHeight);
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(nav);
      return () => observer.disconnect();
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications");
      const list = res.data?.data?.notifications ?? res.data?.notifications ?? [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      refreshNotifications();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: 1 }))
      );
      refreshNotifications();
    } catch {
      // silent
    }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
    if (notif.entity_type === "post" && notif.entity_id) {
      navigate(`/post/${notif.entity_id}`);
    } else if (notif.entity_type === "comment" && notif.entity_id) {
      navigate(`/comment/${notif.entity_id}`);
    } else if (notif.entity_type === "user" && notif.actor_user_id) {
      navigate(`/profile/${notif.actor_user_id}`);
    }
    onClose?.();
  };

  const unreadItems = notifications.filter((n) => !n.is_read);
  const hasUnread = unreadItems.length > 0;

  return (
    <>
      <div className="notif-panel" ref={panelRef} style={{ "--panel-top": `${mobileTop}px` }}>
        <div className="notif-header">
          <h3 className="notif-title">
            <FiBell /> Notifications
          </h3>
          {hasUnread && (
            <button
              className="notif-mark-all-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <FiCheckCircle /> Mark all read
            </button>
          )}
        </div>

        <div className="notif-body">
          {loading ? (
            <div className="notif-empty">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            notifications.map((notif) => {
              const typeColor = TYPE_COLORS[notif.notification_type] || "#6b7280";
              const typeLabel = TYPE_LABELS[notif.notification_type] || notif.notification_type;
              const isUnread = !notif.is_read;
              return (
                <div
                  key={notif.id}
                  className={`notif-item ${isUnread ? "notif-unread" : ""}`}
                  onClick={() => handleClick(notif)}
                >
                  <span
                    className="notif-dot"
                    style={{ backgroundColor: typeColor }}
                  />
                  <div className="notif-content">
                    <div className="notif-type">{typeLabel}</div>
                    <div className="notif-body-text">{notif.body || notif.title || ""}</div>
                    <div className="notif-time">{formatTime(notif.created_at)}</div>
                  </div>
                  {isUnread && (
                    <button
                      className="notif-read-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif.id);
                      }}
                      title="Mark as read"
                    >
                      <FiCheck />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .notif-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 1000;
          width: 380px;
          max-height: 480px;
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--line);
          flex-shrink: 0;
        }
        .notif-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: var(--text);
        }
        .notif-mark-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--brand-2, #3b82f6);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .notif-mark-all-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.08);
        }
        .notif-body {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }
        .notif-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 18px;
          cursor: pointer;
          transition: background 0.15s;
          border-left: 3px solid transparent;
        }
        .notif-item:hover {
          background: rgba(var(--brand-2-rgb), 0.04);
        }
        .notif-unread {
          background: rgba(var(--brand-2-rgb), 0.03);
          border-left-color: var(--brand-2, #3b82f6);
        }
        .notif-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .notif-content {
          flex: 1;
          min-width: 0;
        }
        .notif-type {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .notif-body-text {
          font-size: 14px;
          color: var(--text);
          line-height: 1.4;
          word-break: break-word;
        }
        .notif-time {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
          margin-top: 4px;
        }
        .notif-read-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 2px;
          transition: all 0.15s;
        }
        .notif-read-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.1);
          color: var(--brand-2, #3b82f6);
        }
        @media (max-width: 480px) {
          .notif-panel {
            position: fixed;
            top: var(--panel-top, 56px);
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            max-height: none;
            border-radius: 0;
            border: none;
            z-index: 1000;
          }
        }
      `}</style>
    </>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}
