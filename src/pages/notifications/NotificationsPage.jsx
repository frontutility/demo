import { useState, useEffect, useCallback } from "react";
import { FiBell, FiCheck, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const TYPE_COLORS = {
  agree: "#10b981",
  disagree: "#ef4444",
  comment: "#3b82f6",
  comment_reply: "#8b5cf6",
  share: "#f59e0b",
  follow: "#06b6d4",
  mention: "#ec4899",
};

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

export default function NotificationsPage() {
  const { refreshNotifications } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      refreshNotifications();
    } catch {}
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
  };

  const unreadItems = notifications.filter((n) => !n.is_read);
  const hasUnread = unreadItems.length > 0;

  return (
    <div className="notif-page">
      <div className="notif-page-header">
        <button className="notif-page-back" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <h1><FiBell /> Notifications</h1>
        {hasUnread && (
          <button className="notif-page-mark-all" onClick={handleMarkAllRead}>
            <FiCheckCircle /> Mark all read
          </button>
        )}
      </div>
      <div className="notif-page-body">
        {loading ? (
          <div className="notif-page-empty">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="notif-page-empty">No notifications yet</div>
        ) : (
          notifications.map((notif) => {
            const typeColor = TYPE_COLORS[notif.notification_type] || "#6b7280";
            const typeLabel = TYPE_LABELS[notif.notification_type] || notif.notification_type;
            const isUnread = !notif.is_read;
            return (
              <div
                key={notif.id}
                className={`notif-page-item ${isUnread ? "notif-page-unread" : ""}`}
                onClick={() => handleClick(notif)}
              >
                <span className="notif-page-dot" style={{ backgroundColor: typeColor }} />
                <div className="notif-page-content">
                  <div className="notif-page-type">{typeLabel}</div>
                  <div className="notif-page-text">{notif.body || notif.title || ""}</div>
                  <div className="notif-page-time">{formatTime(notif.created_at)}</div>
                </div>
                {isUnread && (
                  <button
                    className="notif-page-read-btn"
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                  >
                    <FiCheck />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <style>{`
        .notif-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
          min-height: 100vh;
        }
        .notif-page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
          position: sticky;
          top: 0;
          background: var(--bg-solid);
          z-index: 10;
        }
        .notif-page-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: none;
          color: var(--text);
          cursor: pointer;
          border-radius: 8px;
          font-size: 20px;
        }
        .notif-page-back:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
        }
        .notif-page-header h1 {
          flex: 1;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
        }
        .notif-page-mark-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--brand-2, #3b82f6);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .notif-page-mark-all:hover {
          background: rgba(var(--brand-2-rgb), 0.08);
        }
        .notif-page-body {
          padding: 4px 0;
        }
        .notif-page-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
          font-size: 15px;
        }
        .notif-page-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px;
          cursor: pointer;
          transition: background 0.15s;
          border-left: 3px solid transparent;
        }
        .notif-page-item:hover {
          background: rgba(var(--brand-2-rgb), 0.04);
        }
        .notif-page-unread {
          background: rgba(var(--brand-2-rgb), 0.03);
          border-left-color: var(--brand-2, #3b82f6);
        }
        .notif-page-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .notif-page-content {
          flex: 1;
          min-width: 0;
        }
        .notif-page-type {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .notif-page-text {
          font-size: 14px;
          color: var(--text);
          line-height: 1.4;
          word-break: break-word;
        }
        .notif-page-time {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
          margin-top: 4px;
        }
        .notif-page-read-btn {
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
        }
        .notif-page-read-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.1);
          color: var(--brand-2, #3b82f6);
        }
      `}</style>
    </div>
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
