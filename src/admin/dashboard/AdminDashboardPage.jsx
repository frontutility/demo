// AdminDashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiClock,
  FiFileText,
  FiFlag,
  FiLayers,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
  FiUserPlus,
  FiMessageSquare,
  FiHeart,
  FiThumbsDown,
  FiShare2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
} from "react-icons/fi";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import UserAvatar from "../../components/ui/UserAvatar";
import api from "../../services/api";
import { clampWords, formatCount, formatDate } from "../../utils/formatters";
import { normalizePost, normalizeReport, normalizeUser } from "../utils/adminData";
import "./Dashboard.css";

function sumSeries(series = []) {
  return series.reduce((total, entry) => total + (Number(entry?.count) || 0), 0);
}

function formatDateShort(date) {
  if (!date) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(date));
  } catch {
    return "N/A";
  }
}

function DashboardStatCard({ label, value, tone = "info", hint, onClick }) {
  const icons = {
    users: FiUsers,
    posts: FiFileText,
    news: FiFileText,
    villages: FiMapPin,
    reports: FiFlag,
    comments: FiMessageSquare,
    shares: FiShare2,
    agree: FiHeart,
    disagree: FiThumbsDown,
    cms: FiFileText,
    categories: FiLayers,
    blue: FiCheckCircle,
    deleted: FiAlertCircle,
    pending: FiClock,
    today: FiCalendar,
    month: FiCalendar,
    published: FiCheckCircle,
    draft: FiFileText,
    hidden: FiAlertCircle,
    resolved: FiCheckCircle,
    followers: FiUsers,
    following: FiUsers,
    total: FiBarChart2,
  };

  const text = (label || "").toLowerCase();
  const Icon = icons[text.includes('news') ? 'news' :
                   text.includes('cms') ? 'cms' :
                   text.includes('category') ? 'categories' :
                   text.includes('blue') ? 'blue' :
                   text.includes('deleted') ? 'deleted' :
                   text.includes('pending') ? 'pending' :
                   text.includes('published') ? 'published' :
                   text.includes('draft') ? 'draft' :
                   text.includes('hidden') ? 'hidden' :
                   text.includes('resolved') ? 'resolved' :
                   text.includes('today') ? 'today' :
                   text.includes('month') ? 'month' :
                   text.includes('follower') ? 'followers' :
                   text.includes('follow') ? 'following' :
                   text.includes('user') ? 'users' :
                   text.includes('post') ? 'posts' :
                   text.includes('village') ? 'villages' :
                   text.includes('report') ? 'reports' :
                   text.includes('comment') ? 'comments' :
                   text.includes('share') ? 'shares' :
                   text.includes('agree') ? 'agree' :
                   text.includes('disagree') ? 'disagree' :
                   text.includes('total') ? 'total' : null];

  return (
    <button type="button" className={`stat-card stat-card-${tone}`} onClick={onClick}>
      <div className="stat-card-header">
        <span className="stat-card-icon">
          {Icon && <Icon size={18} />}
        </span>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">{formatCount(value ?? 0)}</div>
      {hint && <div className="stat-card-hint">{hint}</div>}
    </button>
  );
}

function MiniMetric({ title, value, note, icon: Icon, onClick }) {
  return (
    <button type="button" className="mini-metric" onClick={onClick}>
      <div className="mini-metric-icon">
        <Icon size={20} />
      </div>
      <div className="mini-metric-content">
        <div className="mini-metric-title">{title}</div>
        <div className="mini-metric-value">{formatCount(value ?? 0)}</div>
        {note && <div className="mini-metric-note">{note}</div>}
      </div>
    </button>
  );
}

function SeriesCard({ title, series = [], totalLabel = "7-day total" }) {
  const total = sumSeries(series);
  const maxValue = Math.max(...series.map(s => Number(s?.count) || 0), 1);
  
  return (
    <div className="series-card">
      <div className="series-card-header">
        <div>
          <div className="series-card-title">{title}</div>
          <div className="series-card-total">
            <span className="total-number">{formatCount(total)}</span>
            <span className="total-label">{totalLabel}</span>
          </div>
        </div>
      </div>
      <div className="series-bars">
        {series.length ? (
          series.map((entry) => {
            const count = Number(entry?.count) || 0;
            const height = Math.max(4, (count / maxValue) * 100);
            const isToday = entry.date === new Date().toISOString().split('T')[0];
            
            return (
              <div key={entry.date} className="series-bar-item">
                <div className="series-bar-track">
                  <div 
                    className={`series-bar-fill ${isToday ? 'bar-today' : ''}`} 
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="series-bar-label">{formatDateShort(entry.date)}</span>
                <strong className="series-bar-count">{formatCount(count)}</strong>
              </div>
            );
          })
        ) : (
          <div className="series-empty">No activity recorded.</div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, tone = "neutral", icon: Icon }) {
  return (
    <div className={`detail-field detail-field-${tone}`}>
      {Icon && <Icon size={16} className="detail-field-icon" />}
      <span className="detail-field-label">{label}</span>
      <span className="detail-field-value">{value ?? "N/A"}</span>
    </div>
  );
}

function EntityCard({ entity, onClick }) {
  return (
    <div className="entity-card" onClick={onClick}>
      <div className="entity-card-content">
        <div className="entity-card-main">
          <span className="entity-card-name">{entity.name || entity.title || "Unknown"}</span>
          <span className="entity-card-sub">{entity.subtitle || entity.username || "N/A"}</span>
        </div>
        <div className="entity-card-meta">
          {entity.count !== undefined && (
            <span className="entity-card-count">{formatCount(entity.count)}</span>
          )}
          <span className="entity-card-arrow">
            <FiArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedEntityLoading, setSelectedEntityLoading] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT Admin | Dashboard";
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/admin/dashboard");
        const payload = response?.data?.data ?? response?.data ?? {};
        if (active) {
          setDashboard(payload);
        }
      } catch (dashboardError) {
        const message = dashboardError?.response?.data?.message || dashboardError.message || "Unable to load dashboard.";
        if (active) {
          setError(message);
          setDashboard(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const summary = dashboard?.summary ?? dashboard ?? {};
  const today = dashboard?.today ?? {};
  const last7Days = dashboard?.last_7_days ?? {};
  const userAnalytics = dashboard?.user_analytics ?? {};
  const villageAnalytics = dashboard?.village_analytics ?? {};
  const postAnalytics = dashboard?.post_analytics ?? {};
  const reportAnalytics = dashboard?.report_analytics ?? {};
  const blueTickAnalytics = dashboard?.blue_tick_analytics ?? {};
  const liveActivityFeed = Array.isArray(dashboard?.live_activity_feed) ? dashboard.live_activity_feed : [];

  const latestUsers = useMemo(() => (Array.isArray(dashboard?.latest_users) ? dashboard.latest_users.map(normalizeUser) : []), [dashboard]);
  const latestPosts = useMemo(() => (Array.isArray(dashboard?.latest_posts) ? dashboard.latest_posts.map(normalizePost) : []), [dashboard]);
  const latestReports = useMemo(() => (Array.isArray(dashboard?.latest_reports) ? dashboard.latest_reports.map(normalizeReport) : []), [dashboard]);

  const topUsersByFollowers = useMemo(
    () => (Array.isArray(userAnalytics.top_users_by_followers) ? userAnalytics.top_users_by_followers.map(normalizeUser) : []),
    [userAnalytics.top_users_by_followers]
  );
  const mostFollowedUser = useMemo(() => normalizeUser(userAnalytics.most_followed_user || {}), [userAnalytics.most_followed_user]);
  const mostActiveUser = useMemo(() => normalizeUser(userAnalytics.most_active_user || {}), [userAnalytics.most_active_user]);
  const mostSharedUser = useMemo(() => normalizeUser(userAnalytics.most_shared_user || {}), [userAnalytics.most_shared_user]);
  const mostReportedUser = useMemo(() => normalizeUser(userAnalytics.most_reported_user || {}), [userAnalytics.most_reported_user]);

  const topVillagesByUsers = Array.isArray(villageAnalytics.top_villages_by_users) ? villageAnalytics.top_villages_by_users : [];
  const topVillagesByPosts = Array.isArray(villageAnalytics.top_villages_by_posts) ? villageAnalytics.top_villages_by_posts : [];
  const fastestGrowingVillage = villageAnalytics.fastest_growing_village || {};

  const mostLikedPosts = useMemo(() => (Array.isArray(postAnalytics.most_liked_posts) ? postAnalytics.most_liked_posts.map(normalizePost) : []), [postAnalytics.most_liked_posts]);
  const mostDislikedPosts = useMemo(() => (Array.isArray(postAnalytics.most_disliked_posts) ? postAnalytics.most_disliked_posts.map(normalizePost) : []), [postAnalytics.most_disliked_posts]);
  const mostSharedPosts = useMemo(() => (Array.isArray(postAnalytics.most_shared_posts) ? postAnalytics.most_shared_posts.map(normalizePost) : []), [postAnalytics.most_shared_posts]);
  const mostCommentedPosts = useMemo(() => (Array.isArray(postAnalytics.most_commented_posts) ? postAnalytics.most_commented_posts.map(normalizePost) : []), [postAnalytics.most_commented_posts]);
  const hiddenPosts = useMemo(() => (Array.isArray(postAnalytics.hidden_posts) ? postAnalytics.hidden_posts.map(normalizePost) : []), [postAnalytics.hidden_posts]);

  const actionStats = [
    { label: "New Users", value: today.new_users_today ?? 0, tone: "success", icon: FiUserPlus },
    { label: "New Posts", value: today.new_posts_today ?? 0, tone: "primary", icon: FiFileText },
    { label: "New Followers", value: today.new_followers_today ?? 0, tone: "info", icon: FiUsers },
    { label: "New Comments", value: today.new_comments_today ?? 0, tone: "warning", icon: FiMessageSquare },
    { label: "New Reports", value: today.new_reports_today ?? 0, tone: "danger", icon: FiFlag },
    { label: "Blue Tick Requests", value: today.new_blue_tick_requests_today ?? 0, tone: "success", icon: FiCheckCircle },
  ];

  const topStats = [
    { label: "Total Users", value: summary.total_users ?? 0, tone: "success", hint: "View all users", onClick: () => navigate("/admin/users") },
    { label: "Active Users", value: summary.active_users ?? 0, tone: "primary", hint: "Active accounts", onClick: () => navigate("/admin/users") },
    { label: "Hidden Users", value: summary.hidden_users ?? 0, tone: "warning", hint: "Hidden accounts", onClick: () => navigate("/admin/users") },
    { label: "Suspended Users", value: summary.suspended_users ?? 0, tone: "danger", hint: "Suspended accounts", onClick: () => navigate("/admin/users") },
    { label: "Verified Users", value: summary.verified_users ?? 0, tone: "info", hint: "Blue tick verified", onClick: () => navigate("/admin/users") },
    { label: "Total Posts", value: summary.total_posts ?? 0, tone: "primary", hint: "All posts", onClick: () => navigate("/admin/posts") },
    { label: "Hidden Posts", value: summary.hidden_posts ?? 0, tone: "warning", hint: "Moderated posts", onClick: () => navigate("/admin/posts") },
    { label: "Total Villages", value: summary.total_villages ?? 0, tone: "success", hint: "All villages", onClick: () => navigate("/admin/villages") },
    { label: "Total Followers", value: summary.total_followers ?? 0, tone: "info", hint: "Total follows", onClick: () => navigate("/admin/users") },
    { label: "Total Comments", value: summary.total_comments ?? 0, tone: "warning", hint: "All comments", onClick: () => navigate("/admin/posts") },
    { label: "Total Shares", value: summary.total_shares ?? 0, tone: "primary", hint: "Post shares", onClick: () => navigate("/admin/posts") },
    { label: "Total Agree", value: summary.total_agree ?? 0, tone: "success", hint: "Agree reactions", onClick: () => navigate("/admin/posts") },
    { label: "Total Disagree", value: summary.total_disagree ?? 0, tone: "danger", hint: "Disagree reactions", onClick: () => navigate("/admin/posts") },
    { label: "Total Reports", value: summary.total_reports ?? 0, tone: "danger", hint: "Reports", onClick: () => navigate("/admin/reports") },
    { label: "Pending Reports", value: summary.pending_reports ?? 0, tone: "warning", hint: "Needs moderation", onClick: () => navigate("/admin/reports") },
    { label: "Pending Blue Ticks", value: summary.pending_blue_tick_requests ?? 0, tone: "info", hint: "Verification requests", onClick: () => navigate("/admin/blue-ticks") },
  ];

  const extendedStats = [
    { label: "Deleted Users", value: summary.deleted_users ?? 0, tone: "danger", hint: "Soft deleted users", onClick: () => navigate("/admin/deleted-users") },
    { label: "New Users Today", value: today.new_users_today ?? 0, tone: "success", hint: "Joined today", onClick: () => navigate("/admin/users") },
    { label: "New Users This Month", value: summary.new_users_this_month ?? 0, tone: "info", hint: "Joined this month", onClick: () => navigate("/admin/users") },
    { label: "Published Posts", value: summary.published_posts ?? 0, tone: "success", hint: "Visible posts", onClick: () => navigate("/admin/posts") },
    { label: "Deleted Posts", value: summary.deleted_posts ?? 0, tone: "danger", hint: "Removed posts", onClick: () => navigate("/admin/posts") },
    { label: "Reported Posts", value: summary.reported_posts ?? 0, tone: "warning", hint: "Posts with reports", onClick: () => navigate("/admin/post-reports") },
    { label: "Published News", value: summary.published_news ?? 0, tone: "primary", hint: "Live news", onClick: () => navigate("/admin/news") },
    { label: "Draft News", value: summary.draft_news ?? 0, tone: "warning", hint: "Draft stories", onClick: () => navigate("/admin/news") },
    { label: "Hidden News", value: summary.hidden_news ?? 0, tone: "warning", hint: "Hidden stories", onClick: () => navigate("/admin/news") },
    { label: "Reported News", value: summary.reported_news ?? 0, tone: "danger", hint: "News reports", onClick: () => navigate("/admin/news") },
    { label: "Resolved Reports", value: summary.resolved_reports ?? 0, tone: "success", hint: "Closed cases", onClick: () => navigate("/admin/reports") },
    { label: "User Reports", value: summary.user_reports ?? 0, tone: "danger", hint: "Profile reports", onClick: () => navigate("/admin/user-reports") },
    { label: "Post Reports", value: summary.post_reports ?? 0, tone: "danger", hint: "Post reports", onClick: () => navigate("/admin/post-reports") },
    { label: "Comment Reports", value: summary.comment_reports ?? 0, tone: "warning", hint: "Comment reports", onClick: () => navigate("/admin/reports") },
    { label: "News Reports", value: summary.news_reports ?? 0, tone: "warning", hint: "News reports", onClick: () => navigate("/admin/reports") },
    { label: "Total Following Relationships", value: summary.total_following_relationships ?? summary.total_followers ?? 0, tone: "info", hint: "Follow links", onClick: () => navigate("/admin/users") },
    { label: "Total Categories", value: summary.total_categories ?? 0, tone: "primary", hint: "Content categories", onClick: () => navigate("/admin/posts") },
    { label: "Total CMS Pages", value: summary.total_cms_pages ?? 0, tone: "info", hint: "Static pages", onClick: () => navigate("/admin/cms") },
  ];

  async function openEntity(kind, row) {
    const id = row?.id ?? row?.userId ?? row?.reportId ?? row?.postId;
    if (!id) return;

    const fallback =
      kind === "user" ? normalizeUser(row) : kind === "post" ? normalizePost(row) : kind === "report" ? normalizeReport(row) : row;

    setSelectedEntity({ kind, data: fallback });
    setSelectedEntityLoading(true);

    try {
      const endpoint = kind === "user" ? `/api/admin/users/${id}` : kind === "post" ? `/api/admin/posts/${id}` : `/api/admin/reports/${id}`;
      const response = await api.get(endpoint);
      const payload = response?.data?.data ?? response?.data ?? {};
      const normalized = kind === "user" ? normalizeUser(payload) : kind === "post" ? normalizePost(payload) : normalizeReport(payload);
      setSelectedEntity({ kind, data: normalized });
    } catch (entityError) {
      showToast?.({
        type: "error",
        title: "Details load failed",
        message: entityError?.response?.data?.message || entityError.message || "Unable to load details.",
      });
    } finally {
      setSelectedEntityLoading(false);
    }
  }

  function closeEntityModal() {
    setSelectedEntity(null);
    setSelectedEntityLoading(false);
  }

  function openFeedItem(feed) {
    if (!feed) return;
    if (feed.linkType === "user" && feed.linkId) {
      return openEntity("user", { id: feed.linkId });
    }
    if (feed.linkType === "post" && feed.linkId) {
      return openEntity("post", { id: feed.linkId });
    }
    if (feed.linkType === "report" && feed.linkId) {
      return openEntity("report", { id: feed.linkId });
    }
    if (feed.linkType === "villages" && feed.linkId) {
      navigate("/admin/villages");
    }
  }

  const selectedData = selectedEntity?.data || null;

  return (
    <div className="dashboard-shell">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-eyebrow">
            <span className="eyebrow-dot"></span>
            Enterprise Operations Console
          </div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Live MySQL-backed overview of users, posts, villages, moderation, 
            verification, and platform activity.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="btn-hero btn-hero-primary" onClick={() => navigate("/admin/users")}>
            <FiUsers /> Users
          </button>
          <button className="btn-hero btn-hero-secondary" onClick={() => navigate("/admin/posts")}>
            <FiFileText /> Posts
          </button>
          <button className="btn-hero btn-hero-secondary" onClick={() => navigate("/admin/user-reports")}>
            <FiFlag />User Reports
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Dashboard unavailable" message={error} />
      ) : (
        <>
          {/* Top Statistics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Platform Overview</h2>
              <span className="section-badge">Live</span>
            </div>
            <div className="stats-grid">
              {topStats.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} />
              ))}
            </div>
          </section>

          {/* Expanded Platform Metrics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Expanded Platform Metrics</h2>
              <span className="section-badge">More insights</span>
            </div>
            <div className="stats-grid">
              {extendedStats.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} />
              ))}
            </div>
          </section>

          {/* Today's Activity */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Today's Activity</h2>
              <span className="section-time">
                <FiClock size={14} />
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </span>
            </div>
            <div className="mini-metrics-grid">
              {actionStats.map((item) => (
                <MiniMetric key={item.label} {...item} />
              ))}
            </div>
          </section>

          {/* Last 7 Days */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Last 7 Days Activity</h2>
            </div>
            <div className="series-grid">
              <SeriesCard title="Users Joined" series={last7Days.users_joined || []} />
              <SeriesCard title="Posts Created" series={last7Days.posts_created || []} />
              <SeriesCard title="Followers Added" series={last7Days.followers_added || []} />
              <SeriesCard title="Comments Added" series={last7Days.comments_added || []} />
            </div>
          </section>

          {/* Latest Users, Posts, Reports */}
          <div className="dashboard-grid-3">
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Latest Users</h2>
                <button className="section-action" onClick={() => navigate("/admin/users")}>
                  View All <FiArrowRight size={14} />
                </button>
              </div>
              {latestUsers.length ? (
                <div className="entity-list">
                  {latestUsers.slice(0, 5).map((user) => (
                    <EntityCard 
                      key={user.id}
                      entity={{
                        name: user.name || user.username,
                        subtitle: `@${user.username}`,
                        count: user.followers,
                      }}
                      onClick={() => openEntity("user", user)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No users" message="No users returned." />
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Latest Posts</h2>
                <button className="section-action" onClick={() => navigate("/admin/posts")}>
                  View All <FiArrowRight size={14} />
                </button>
              </div>
              {latestPosts.length ? (
                <div className="entity-list">
                  {latestPosts.slice(0, 5).map((post) => (
                    <EntityCard 
                      key={post.id}
                      entity={{
                        name: clampWords(post.content || "", 12),
                        subtitle: post.author?.name || "Unknown",
                        count: post.agrees,
                      }}
                      onClick={() => openEntity("post", post)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No posts" message="No post activity yet." />
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Latest Reports</h2>
                <button className="section-action" onClick={() => navigate("/admin/reports")}>
                  View All <FiArrowRight size={14} />
                </button>
              </div>
              {latestReports.length ? (
                <div className="entity-list">
                  {latestReports.slice(0, 5).map((report) => (
                    <EntityCard 
                      key={report.id}
                      entity={{
                        name: `Report #${report.id}`,
                        subtitle: report.reason || "No reason",
                        count: report.status === "pending" ? "⚠" : "✓",
                      }}
                      onClick={() => openEntity("report", report)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No reports" message="No moderation reports yet." />
              )}
            </section>
          </div>

          {/* User Analytics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">User Analytics</h2>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3 className="analytics-card-title">Top Users by Followers</h3>
                {topUsersByFollowers.length ? (
                  <div className="top-users-list">
                    {topUsersByFollowers.slice(0, 5).map((user, index) => (
                      <div 
                        key={user.id} 
                        className="top-user-item"
                        onClick={() => openEntity("user", user)}
                      >
                        <div className="top-user-rank">{index + 1}</div>
                        <div className="top-user-info">
                          <span className="top-user-name">{user.name || user.username}</span>
                          <span className="top-user-username">@{user.username}</span>
                        </div>
                        <div className="top-user-count">
                          {formatCount(user.followers ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No data" message="Top followers data will appear here." />
                )}
              </div>

              <div className="analytics-mini-grid">
                <MiniMetric 
                  title="Most Followed" 
                  value={mostFollowedUser.followers || 0} 
                  note={mostFollowedUser.name || mostFollowedUser.username || "N/A"} 
                  icon={FiUsers} 
                  onClick={() => openEntity("user", mostFollowedUser)} 
                />
                <MiniMetric 
                  title="Most Active" 
                  value={mostActiveUser.activity_score || 0} 
                  note={mostActiveUser.name || mostActiveUser.username || "N/A"} 
                  icon={FiActivity} 
                  onClick={() => openEntity("user", mostActiveUser)} 
                />
                <MiniMetric 
                  title="Most Shared" 
                  value={mostSharedUser.shares_count || 0} 
                  note={mostSharedUser.name || mostSharedUser.username || "N/A"} 
                  icon={FiTrendingUp} 
                  onClick={() => openEntity("user", mostSharedUser)} 
                />
                <MiniMetric 
                  title="Most Reported" 
                  value={mostReportedUser.reports_count || 0} 
                  note={mostReportedUser.name || mostReportedUser.username || "N/A"} 
                  icon={FiTrendingDown} 
                  onClick={() => openEntity("user", mostReportedUser)} 
                />
              </div>
            </div>
          </section>

          {/* Village Analytics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Village Analytics</h2>
            </div>
            <div className="village-analytics-grid">
              <div className="analytics-card">
                <h3 className="analytics-card-title">Top Villages by Users</h3>
                {topVillagesByUsers.length ? (
                  <div className="top-users-list">
                    {topVillagesByUsers.slice(0, 5).map((village) => (
                      <div 
                        key={village.id} 
                        className="top-user-item"
                        onClick={() => navigate("/admin/villages")}
                      >
                        <div className="top-user-rank">
                          <FiMapPin size={16} />
                        </div>
                        <div className="top-user-info">
                          <span className="top-user-name">{village.name || "N/A"}</span>
                        </div>
                        <div className="top-user-count">
                          {formatCount(village.users ?? 0)} users
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No data" message="Village-to-user metrics will appear here." />
                )}
              </div>

              <div className="analytics-card">
                <h3 className="analytics-card-title">Top Villages by Posts</h3>
                {topVillagesByPosts.length ? (
                  <div className="top-users-list">
                    {topVillagesByPosts.slice(0, 5).map((village) => (
                      <div 
                        key={village.id} 
                        className="top-user-item"
                        onClick={() => navigate("/admin/villages")}
                      >
                        <div className="top-user-rank">
                          <FiFileText size={16} />
                        </div>
                        <div className="top-user-info">
                          <span className="top-user-name">{village.name || "N/A"}</span>
                        </div>
                        <div className="top-user-count">
                          {formatCount(village.posts ?? 0)} posts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No data" message="Village-to-post metrics will appear here." />
                )}
              </div>

              <div className="analytics-card">
                <h3 className="analytics-card-title">Fastest Growing</h3>
                <div className="fastest-growing">
                  <div className="fastest-growing-icon">
                    <FiLayers size={32} />
                  </div>
                  <div>
                    <div className="fastest-growing-name">
                      {fastestGrowingVillage.name || "N/A"}
                    </div>
                    <div className="fastest-growing-count">
                      +{formatCount(fastestGrowingVillage.new_users || 0)} new users
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Post Analytics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Post Analytics</h2>
            </div>
            <div className="post-analytics-grid">
              {[
                { title: "Most Liked", data: mostLikedPosts, icon: FiHeart, color: "red" },
                { title: "Most Disliked", data: mostDislikedPosts, icon: FiThumbsDown, color: "red" },
                { title: "Most Shared", data: mostSharedPosts, icon: FiShare2, color: "blue" },
                { title: "Most Commented", data: mostCommentedPosts, icon: FiMessageSquare, color: "green" },
                { title: "Hidden Posts", data: hiddenPosts, icon: FiAlertCircle, color: "orange" },
              ].map(({ title, data, icon: Icon, color }) => (
                <div className="analytics-card" key={title}>
                  <div className="analytics-card-header">
                    <h3 className="analytics-card-title">{title}</h3>
                    <Icon size={18} className={`post-icon-${color}`} />
                  </div>
                  {data.length ? (
                    <div className="post-list">
                      {data.slice(0, 4).map((post) => (
                        <div 
                          key={post.id} 
                          className="post-list-item"
                          onClick={() => openEntity("post", post)}
                        >
                          <div className="post-list-content">
                            <div className="post-list-text">{clampWords(post.content || "", 15)}</div>
                            <div className="post-list-meta">
                              {post.author?.name || "Unknown"} • {post.village || "N/A"}
                            </div>
                          </div>
                          <div className="post-list-count">{formatCount(post.agrees || post.disagrees || post.shares || post.comments || 0)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No data" message={`${title} will appear here.`} />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Report Analytics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Report Analytics</h2>
            </div>
            <div className="report-analytics-grid">
              <div className="analytics-mini-grid">
                <MiniMetric 
                  title="Pending Reports" 
                  value={reportAnalytics.pending_reports ?? summary.pending_reports ?? 0} 
                  note="Needs moderation" 
                  icon={FiFlag} 
                  onClick={() => navigate("/admin/reports")} 
                />
                <MiniMetric 
                  title="Resolved Reports" 
                  value={reportAnalytics.resolved_reports ?? 0} 
                  note="Completed" 
                  icon={FiCheckCircle} 
                  onClick={() => navigate("/admin/reports")} 
                />
                <MiniMetric 
                  title="Rejected Reports" 
                  value={reportAnalytics.rejected_reports ?? 0} 
                  note="Dismissed" 
                  icon={FiXCircle} 
                  onClick={() => navigate("/admin/reports")} 
                />
              </div>

              <div className="analytics-grid-2">
                <div className="analytics-card">
                  <h3 className="analytics-card-title">Most Reported Posts</h3>
                  {Array.isArray(reportAnalytics.most_reported_posts) && reportAnalytics.most_reported_posts.length ? (
                    <div className="post-list">
                      {reportAnalytics.most_reported_posts.slice(0, 4).map((post) => {
                        const normalized = normalizePost(post);
                        return (
                          <div 
                            key={normalized.id} 
                            className="post-list-item"
                            onClick={() => openEntity("post", normalized)}
                          >
                            <div className="post-list-content">
                              <div className="post-list-text">{clampWords(normalized.content || "", 15)}</div>
                              <div className="post-list-meta">
                                {normalized.author?.name || "Unknown"} • {normalized.village || "N/A"}
                              </div>
                            </div>
                            <div className="post-list-count">{formatCount(normalized.reports || 0)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState title="No data" message="Most reported posts will appear here." />
                  )}
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card-title">Most Reported Users</h3>
                  {Array.isArray(reportAnalytics.most_reported_users) && reportAnalytics.most_reported_users.length ? (
                    <div className="top-users-list">
                      {reportAnalytics.most_reported_users.slice(0, 4).map((user) => {
                        const normalized = normalizeUser(user);
                        return (
                          <div 
                            key={normalized.id} 
                            className="top-user-item"
                            onClick={() => openEntity("user", normalized)}
                          >
                            <div className="top-user-info">
                              <span className="top-user-name">{normalized.name || normalized.username || "Unknown"}</span>
                              <span className="top-user-username">@{normalized.username || "unknown"}</span>
                            </div>
                            <div className="top-user-count">
                              {formatCount(normalized.reports_count ?? normalized.reports ?? 0)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState title="No data" message="Most reported users will appear here." />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Blue Tick Analytics */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Blue Tick Analytics</h2>
              <span className="section-badge section-badge-verified">
                <FiCheckCircle size={14} /> Verification
              </span>
            </div>
            <div className="mini-metrics-grid">
              <MiniMetric 
                title="Pending Requests" 
                value={blueTickAnalytics.pending_requests ?? summary.pending_blue_tick_requests ?? 0} 
                note="Awaiting review" 
                icon={FiClock} 
                onClick={() => navigate("/admin/blue-ticks")} 
              />
              <MiniMetric 
                title="Approved" 
                value={blueTickAnalytics.approved_requests ?? 0} 
                note="Verification approved" 
                icon={FiCheckCircle} 
                onClick={() => navigate("/admin/blue-ticks")} 
              />
              <MiniMetric 
                title="Rejected" 
                value={blueTickAnalytics.rejected_requests ?? 0} 
                note="Request denied" 
                icon={FiXCircle} 
                onClick={() => navigate("/admin/blue-ticks")} 
              />
              <MiniMetric 
                title="Revoked" 
                value={blueTickAnalytics.revoked_requests ?? 0} 
                note="Badge revoked" 
                icon={FiAlertCircle} 
                onClick={() => navigate("/admin/blue-ticks")} 
              />
              <MiniMetric 
                title="Verified Users" 
                value={blueTickAnalytics.verified_users ?? summary.verified_users ?? 0} 
                note="Total verified" 
                icon={FiUsers} 
                onClick={() => navigate("/admin/users")} 
              />
            </div>
          </section>

          {/* Live Activity Feed */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Live Activity Feed</h2>
              <span className="section-badge section-badge-live">
                <span className="live-dot"></span>
                Live
              </span>
            </div>
            {liveActivityFeed.length ? (
              <div className="activity-feed">
                {liveActivityFeed.map((entry, index) => (
                  <div
                    key={`${entry.type || "activity"}-${entry.entityId || index}`}
                    className="activity-item"
                    onClick={() => openFeedItem(entry)}
                  >
                    <div className="activity-icon">
                      {entry.type === "post" ? <FiFileText /> : 
                       entry.type === "follow" ? <FiUsers /> : 
                       entry.type === "report" ? <FiFlag /> : 
                       entry.type === "blue_tick_request" ? <FiCheckCircle /> : 
                       <FiActivity />}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{entry.title || "Activity"}</div>
                      <div className="activity-description">{entry.description || "Latest platform event"}</div>
                    </div>
                    <div className="activity-time">{entry.createdAt ? formatDate(entry.createdAt) : "N/A"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No live activity" message="Recent platform events will appear here." />
            )}
          </section>
        </>
      )}

      {/* Entity Modal */}
      <AdminModal
        open={Boolean(selectedEntity)}
        title={
          selectedEntity?.kind === "user" ? "User Details" :
          selectedEntity?.kind === "post" ? "Post Details" :
          selectedEntity?.kind === "report" ? "Report Details" :
          "Details"
        }
        subtitle="Database-backed record from the admin dashboard"
        size="lg"
        onClose={closeEntityModal}
      >
        {selectedEntityLoading && !selectedData ? (
          <SkeletonCard />
        ) : selectedEntity?.kind === "user" && selectedData ? (
          <div className="modal-content">
            <div className="modal-user-header">
              <UserAvatar user={selectedData} name={selectedData.name || selectedData.username} size={64} />
              <div>
                <h3 className="modal-user-name">{selectedData.name || "Unnamed user"}</h3>
                <div className="modal-user-username">@{selectedData.username || "unknown"}</div>
              </div>
            </div>
            <div className="modal-details-grid">
              <DetailField label="Email" value={selectedData.email} icon={FiMail} />
              <DetailField label="Phone" value={selectedData.mobile} icon={FiPhone} />
              <DetailField label="Village" value={selectedData.villageName || selectedData.village} icon={FiMapPin} />
              <DetailField label="Followers" value={formatCount(selectedData.followers)} icon={FiUsers} />
              <DetailField label="Following" value={formatCount(selectedData.following)} icon={FiUsers} />
              <DetailField label="Posts" value={formatCount(selectedData.posts)} icon={FiFileText} />
              <DetailField label="Comments" value={formatCount(selectedData.comments)} icon={FiMessageSquare} />
              <DetailField label="Agree" value={formatCount(selectedData.agreeCount ?? selectedData.agree_count ?? 0)} icon={FiHeart} />
              <DetailField label="Disagree" value={formatCount(selectedData.disagreeCount ?? selectedData.disagree_count ?? 0)} icon={FiThumbsDown} />
              <DetailField label="Shares" value={formatCount(selectedData.shares ?? selectedData.shares_count ?? 0)} icon={FiShare2} />
              <DetailField 
                label="Blue Tick" 
                value={selectedData.blueTickStatus} 
                tone="info" 
                icon={FiCheckCircle} 
              />
              <DetailField 
                label="Account Status" 
                value={selectedData.accountStatus} 
                tone={selectedData.accountStatus === "hidden" ? "warning" : selectedData.accountStatus === "suspended" ? "danger" : "success"} 
                icon={FiAlertCircle} 
              />
              <DetailField 
                label="Created" 
                value={selectedData.createdAt ? formatDate(selectedData.createdAt) : "N/A"} 
                icon={FiCalendar} 
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => navigate("/admin/users")}>
                View All Users <FiArrowRight />
              </button>
            </div>
          </div>
        ) : selectedEntity?.kind === "post" && selectedData ? (
          <div className="modal-content">
            <div className="modal-post-header">
              <div className="modal-post-icon">
                <FiFileText size={24} />
              </div>
              <div>
                <h3 className="modal-post-author">{selectedData.author?.name || "Unknown author"}</h3>
                <div className="modal-post-meta">
                  @{selectedData.author?.username || "unknown"} • {selectedData.village || selectedData.villageName || "N/A"}
                </div>
              </div>
            </div>
            <div className="modal-post-content">
              <p>{selectedData.content || "No post content available."}</p>
            </div>
            <div className="modal-details-grid">
              <DetailField label="Agree" value={formatCount(selectedData.agrees)} icon={FiHeart} tone="success" />
              <DetailField label="Disagree" value={formatCount(selectedData.disagrees)} icon={FiThumbsDown} tone="danger" />
              <DetailField label="Comments" value={formatCount(selectedData.comments)} icon={FiMessageSquare} tone="info" />
              <DetailField label="Shares" value={formatCount(selectedData.shares)} icon={FiShare2} tone="primary" />
              <DetailField label="Reports" value={formatCount(selectedData.reports)} icon={FiFlag} tone="danger" />
              <DetailField 
                label="Visibility" 
                value={selectedData.visibility} 
                tone={selectedData.visibility === "hidden" ? "warning" : "success"} 
                icon={FiAlertCircle} 
              />
              <DetailField label="Created" value={selectedData.createdAt ? formatDate(selectedData.createdAt) : "N/A"} icon={FiCalendar} />
              <DetailField label="Updated" value={selectedData.updatedAt ? formatDate(selectedData.updatedAt) : "N/A"} icon={FiCalendar} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => navigate("/admin/posts")}>
                View All Posts <FiArrowRight />
              </button>
            </div>
          </div>
        ) : selectedEntity?.kind === "report" && selectedData ? (
          <div className="modal-content">
            <div className="modal-details-grid">
              <DetailField label="Report ID" value={`#${selectedData.id}`} icon={FiFlag} />
              <DetailField label="Type" value={selectedData.reportType || "post"} icon={FiFileText} />
              <DetailField label="Post ID" value={`#${selectedData.postId || selectedData.reportedPostId || "N/A"}`} icon={FiFileText} />
              <DetailField label="Reason" value={selectedData.reason || "N/A"} icon={FiAlertCircle} />
              <DetailField label="Custom Reason" value={selectedData.customReason || "N/A"} icon={FiAlertCircle} />
              <DetailField 
                label="Status" 
                value={selectedData.status} 
                tone={selectedData.status === "pending" ? "warning" : selectedData.status === "resolved" ? "success" : "danger"} 
                icon={FiCheckCircle} 
              />
              <DetailField label="Reporter" value={`@${selectedData.reportedByDisplayName || selectedData.reportedBy || "unknown"}`} icon={FiUsers} />
              <DetailField label="Reported User" value={`@${selectedData.reportedUserUsername || selectedData.reportedUserName || "N/A"}`} icon={FiUsers} />
              <DetailField label="Created" value={selectedData.createdAt ? formatDate(selectedData.createdAt) : "N/A"} icon={FiCalendar} />
              <DetailField label="Updated" value={selectedData.updatedAt ? formatDate(selectedData.updatedAt) : "N/A"} icon={FiCalendar} />
            </div>
            {selectedData.postContent && (
              <div className="modal-post-content">
                <strong>Post Context</strong>
                <p>{selectedData.postContent}</p>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => navigate("/admin/reports")}>
                View All Reports <FiArrowRight />
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}