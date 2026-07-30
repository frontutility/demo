import { Link } from "react-router-dom";
import { FiTrendingUp, FiUsers, FiAward, FiZap } from "react-icons/fi";
import { useApiResource } from "../../api/useApiResource";
import UserAvatar from "../ui/UserAvatar";
import UserNameWithBadge from "../ui/UserNameWithBadge";
import EmptyState from "../ui/EmptyState";
import SkeletonCard from "../ui/SkeletonCard";
import { formatCount } from "../../utils/formatters";
import { getPostPath, getProfilePath } from "../../utils/profile";

export default function RightSidebar({ onClose } = {}) {
  // Use server-side top posts endpoint to reliably get the top 5 posts
  const { data: posts = [], loading: postsLoading } = useApiResource("/api/posts/top", { initialData: [] });
  const { data: users = [] } = useApiResource("/api/users", { initialData: [] });
  const { data: topUsers = [], loading: topUsersLoading } = useApiResource("/api/users/top", { initialData: [] });
  const postsList = Array.isArray(posts) ? posts : [];
  const usersList = Array.isArray(users) ? users : [];
  // If backend returns already top posts, use as-is; otherwise sort and limit defensively
  const topPosts = Array.isArray(postsList) && postsList.length
    ? postsList.slice(0, 5)
    : postsList
        .slice()
        .sort((a, b) => (Number(b.agrees ?? b.agrees_count ?? 0) || 0) - (Number(a.agrees ?? a.agrees_count ?? 0) || 0))
        .slice(0, 5);

  function summarizePost(text, maxLength = 100) {
    const content = String(text || "").trim();
    return content.length > maxLength ? `${content.slice(0, maxLength).trim()}...` : content;
  }

  return (
    <aside className="right-sidebar">
      <div className="sidebar-inner">
        {/* Top Posts */}
        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <FiTrendingUp className="header-icon" />
            <span className="header-title">Top Posts</span>
            <span className="header-badge">🔥</span>
          </div>
          <div className="sidebar-card-body">
            {postsLoading ? (
              <SkeletonCard />
            ) : topPosts.length ? (
              <div className="post-list">
                {topPosts.map((post, index) => {
                  const user = usersList.find((entry) => String(entry.id) === String(post.userId || post.user_id));
                  const villageLabel = user?.village || user?.village_name || "Unknown village";
                  return (
                    <Link key={post.id} to={getPostPath(post, user)} className="post-item" onClick={() => onClose?.()}>
                      <div className="post-rank">{index + 1}</div>
                      <div className="post-content">
                        <div className="post-text">{summarizePost(post.content, 100)}</div>
                        <div className="post-meta">
                          <span className="village">{villageLabel}</span>
                          <span className="divider">•</span>
                          <span className="agree-count">👍 {formatCount(post.agrees || post.agrees_count || 0)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No posts available" message="Top posts will appear here once the feed has data." />
            )}
          </div>
        </div>

        {/* Top Community Members */}
        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <FiUsers className="header-icon" />
            <span className="header-title">Top Members</span>
            <span className="header-badge">🏆</span>
          </div>
          <div className="sidebar-card-body">
            {topUsersLoading ? (
              <SkeletonCard />
            ) : Array.isArray(topUsers) && topUsers.length ? (
              <div className="member-list">
                {topUsers.map((user, index) => (
                  <Link
                    key={user.id}
                    to={getProfilePath(user)}
                    className="member-item"
                    onClick={() => onClose?.()}
                  >
                    <div className="member-rank">{index + 1}</div>
                    <UserAvatar user={user} name={user.name || user.username} size={36} />
                    <div className="member-info">
                      <UserNameWithBadge user={user} name={user.name || user.username || "User"} link={false} className="member-name" />
                      <div className="member-username">@{user.username || ""}</div>
                      <div className="member-followers">{formatCount(user.followers_count || 0)} followers</div>
                    </div>
                    {/* {index < 3 && <div className="member-crown">👑</div>} */}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No members yet" message="Top members will appear here as users gain followers." />
            )}
          </div>
        </div>
      </div>

      <style>{`
        .right-sidebar {
          position: sticky;
          top: 88px;
          max-height: calc(100vh - 112px);
          overflow-y: auto;
          padding: 0 4px;
        }
        .right-sidebar::-webkit-scrollbar {
          width: 3px;
        }
        .right-sidebar::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 10px;
        }

        .sidebar-inner {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Sidebar Cards */
        .sidebar-card {
          background: var(--bg-solid);
          border-radius: 16px;
          border: 1px solid var(--line);
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .sidebar-card:hover {
    border-color: rgba(var(--brand-2-rgb), 0.15);
  }

  .sidebar-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px 10px 18px;
    border-bottom: 1px solid var(--line);
  }
  .header-icon {
    color: var(--brand-2);
    font-size: 18px;
    flex-shrink: 0;
  }
        .header-title {
          font-weight: 700;
          font-size: 14px;
          flex: 1;
        }
        .header-badge {
          font-size: 16px;
          opacity: 0.7;
        }

        .sidebar-card-body {
          padding: 10px 6px;
        }

        /* Post List */
        .right-sidebar .post-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .right-sidebar .post-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          padding: 6px 8px;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
        }
        .right-sidebar .post-item:hover {
    background: rgba(var(--brand-2-rgb), 0.06);
    transform: translateX(2px);
  }
  .right-sidebar .post-rank {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    min-width: 20px;
    text-align: center;
    padding-top: 2px;
  }
  .right-sidebar .post-item:nth-child(1) .post-rank { color: var(--warning); font-size: 14px; }
  .right-sidebar .post-item:nth-child(2) .post-rank { color: var(--text-secondary); font-size: 13px; }
  .right-sidebar .post-item:nth-child(3) .post-rank { color: var(--warning); font-size: 13px; }
        .right-sidebar .post-content {
          flex: 1;
          min-width: 0;
        }
        .right-sidebar .post-text {
          font-weight: 500;
          font-size: 13px;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .right-sidebar .post-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          font-size: 11px;
          color: #6b7280;
        }
        .right-sidebar .post-meta .village {
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .right-sidebar .post-meta .divider {
          opacity: 0.4;
        }
        .right-sidebar .post-meta .agree-count {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* Member List */
        .member-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          cursor: pointer;
          position: relative;
        }
        .member-item:hover {
          background: rgba(37, 99, 235, 0.06);
          transform: translateX(2px);
        }
        .member-rank {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          min-width: 20px;
          text-align: center;
        }
        .member-item:nth-child(1) .member-rank { color: #f59e0b; font-size: 14px; }
        .member-item:nth-child(2) .member-rank { color: #9ca3af; font-size: 13px; }
        .member-item:nth-child(3) .member-rank { color: #d97706; font-size: 13px; }
        .member-info {
          flex: 1;
          min-width: 0;
        }
        .member-name {
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .member-name .blue-tick {
          flex-shrink: 0;
        }
        .member-followers {
          font-size: 11px;
          color: #6b7280;
        }
        .member-username {
          font-size: 11px;
          color: #6b7280;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .member-crown {
          font-size: 16px;
          flex-shrink: 0;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .right-sidebar {
            padding: 0;
          }
          .sidebar-card-header {
            padding: 12px 14px 8px 14px;
          }
          .sidebar-card-body {
            padding: 8px 10px 12px 10px;
          }
          .right-sidebar .post-item {
            padding: 8px 10px;
          }
          .member-item {
            padding: 6px 8px;
          }
        }

        @media (max-width: 768px) {
          .right-sidebar {
            position: static;
            max-height: none;
            overflow-y: visible;
          }
          .sidebar-inner {
            gap: 12px;
          }
          .sidebar-card {
            border-radius: 12px;
          }
          .right-sidebar .post-text {
            font-size: 12px;
          }
          .member-name {
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .sidebar-card-header {
            padding: 10px 12px 6px 12px;
          }
          .header-title {
            font-size: 13px;
          }
          .header-icon {
            font-size: 16px;
          }
          .sidebar-card-body {
            padding: 6px 8px 10px 8px;
          }
          .post-item {
            padding: 6px 8px;
            gap: 8px;
          }
          .post-text {
            font-size: 11px;
          }
          .post-meta {
            font-size: 10px;
          }
          .member-item {
            padding: 4px 6px;
            gap: 8px;
          }
          .member-name {
            font-size: 11px;
          }
          .member-followers {
            font-size: 10px;
          }
          .member-rank {
            font-size: 11px;
            min-width: 16px;
          }
          .post-rank {
            font-size: 11px;
            min-width: 16px;
          }
          .member-crown {
            font-size: 14px;
          }
        }
      `}</style>
    </aside>
  );
}
