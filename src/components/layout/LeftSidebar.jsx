import { 
  FiHome, 
  FiMessageSquare, 
  FiPlusCircle, 
  FiSettings, 
  FiTrendingUp, 
  FiUser, 
  FiInfo, 
  FiShield, 
  FiFileText, 
  FiMail,
  FiLogIn,
  FiUserPlus,
  FiAward,
  FiHelpCircle,
  FiZap,
  FiChevronDown,
  FiChevronRight,
  FiBriefcase,
  FiHeart
} from "react-icons/fi";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { useApiResource } from "../../api/useApiResource";
import { getProfilePath } from "../../utils/profile";
import { useNavigation } from "../../context/NavigationContext";

const links = [
  { key: "sidebar_home", to: "/", label: "Home", icon: <FiHome />, badge: null },
  { key: "sidebar_latest_posts", to: "/search", label: "Latest Posts", icon: <FiMessageSquare />, badge: null },
  { key: "sidebar_news", to: "/news", label: "News", icon: <FiFileText />, badge: null },
  { key: "sidebar_business_directory", to: "/business-directory", label: "Business Directory", icon: <FiBriefcase />, badge: null },
  { to: "/search?tab=trending", label: "Trending", icon: <FiTrendingUp />, badge: "🔥" },
  { to: "/donation", label: "Donation", icon: <FiHeart />, badge: "❤️" },
  { to: "/help-center", label: "Help Center", icon: <FiHelpCircle />, badge: null },

];

const navigationKeyByRoute = {
  "/search?tab=trending": "sidebar_trending",
  "/donation": "sidebar_donation",
  "/help-center": "sidebar_help_center",
  "/settings": "sidebar_settings",
};

export default function LeftSidebar({ onClose } = {}) {
  const { user } = useAuth();
  const { siteName } = useSiteSettings();
  const { isEnabled, itemsFor } = useNavigation();
  const { data: cmsPages = [], loading: cmsLoading } = useApiResource("/api/cms/pages", {
    initialData: [],
    transform: (value) => (Array.isArray(value) ? value : []),
  });
  
  // ✅ State for collapsible pages section
  const [isPagesOpen, setIsPagesOpen] = useState(false);

  const publishedCmsPages = Array.isArray(cmsPages)
    ? cmsPages.filter((page) => page.is_published === 1 || page.is_published === true)
    : [];

  const pagesLinks = publishedCmsPages
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title))
    .map((page) => ({
      to: `/pages/${page.slug}`,
      label: page.title,
      icon: <FiFileText />,
      badge: null,
    }));

  const sidebarLinks = user.loggedIn
    ? [
        ...links,
        { key: "sidebar_profile", to: getProfilePath(user), label: "My Profile", icon: <FiUser />, badge: null },
        { to: "/settings", label: "Settings", icon: <FiSettings />, badge: "⚙️" },
      ]
    : links;
  const dynamicSidebarLinks = itemsFor("left_sidebar")
    .filter((item) => !item.navKey.startsWith("sidebar_") && (!item.authRequired || user.loggedIn));

  // ✅ Toggle function
  const togglePages = () => {
    setIsPagesOpen(!isPagesOpen);
  };

  return (
    <aside className="left-sidebar">
      <div className="sidebar-inner">
        {cmsLoading && (
          <div className="sidebar-loading">Loading pages…</div>
        )}

        {/* Navigation Links */}
        <nav className="nav-links">
          {sidebarLinks.filter((link) => isEnabled(link.key || navigationKeyByRoute[link.to])).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`.trim()
              }
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
              {link.badge && <span className="nav-badge">{link.badge}</span>}
            </NavLink>
          ))}
          {dynamicSidebarLinks.map((link) => (
            <NavLink key={link.id || link.navKey} to={link.route} onClick={() => onClose?.()} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`.trim()}>
              <span className="nav-icon"><FiZap /></span>
              <span className="nav-label">{link.name}</span>
            </NavLink>
          ))}

          {/* ✅ Collapsible Pages Section */}
          {isEnabled("sidebar_cms_pages") && pagesLinks.length > 0 && (
            <div className="pages-section">
              <div 
                className="pages-section-header" 
                onClick={togglePages}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePages();
                  }
                }}
              >
                <span className="pages-section-title">
                  <FiFileText className="pages-icon" /> Pages
                </span>
                <span className="pages-chevron">
                  {isPagesOpen ? <FiChevronDown /> : <FiChevronRight />}
                </span>
              </div>
              
              {/* ✅ Pages links - collapse/expand */}
              <div className={`pages-links ${isPagesOpen ? 'open' : 'closed'}`}>
                {pagesLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => {
                      onClose?.();
                      // Optional: close pages after click on mobile
                      if (window.innerWidth < 768) {
                        setIsPagesOpen(false);
                      }
                    }}
                    className={({ isActive }) =>
                      `nav-link page-link ${isActive ? "active" : ""}`.trim()
                    }
                  >
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-label">{link.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Action Buttons */}
        <div className="action-section">
          {user.loggedIn && isEnabled("sidebar_create_post") ? (
            <Link to="/post/new" className="create-post-btn" onClick={() => onClose?.()}>
              <FiPlusCircle /> Create Post
            </Link>
          ) : !user.loggedIn && (isEnabled("sidebar_login") || isEnabled("sidebar_register")) ? (
            <div className="auth-buttons">
              {isEnabled("sidebar_login") && <Link to="/login" className="auth-btn login-btn" onClick={() => onClose?.()}>
                <FiLogIn /> Login
              </Link>}
              {isEnabled("sidebar_register") && <Link to="/register" className="auth-btn register-btn" onClick={() => onClose?.()}>
                <FiUserPlus /> Register
              </Link>}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="footer-brand">{siteName}</div>
          <div className="footer-version">v1.0.0</div>
        </div>
      </div>

      <style>{`
        .left-sidebar {
          position: sticky;
          top: 88px;
          max-height: calc(100vh - 112px);
          overflow-y: auto;
          padding: 0 4px;
          width: 100%;
        }
        .left-sidebar::-webkit-scrollbar {
          width: 3px;
        }
        .left-sidebar::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 10px;
        }

        .sidebar-inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-solid);
          border-radius: 16px;
          border: 1px solid var(--line);
          padding: 12px 14px 14px 14px;
          transition: border-color 0.2s ease;
        }
        .sidebar-inner:hover {
          border-color: rgba(37, 99, 235, 0.12);
        }

        /* User Card */
        .user-card {
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }
        .user-card-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          padding: 6px 8px;
          border-radius: 10px;
          transition: background 0.2s ease;
        }
        .user-card-link:hover {
          background: rgba(37, 99, 235, 0.06);
        }
        .user-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }
        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--line);
          background: var(--bg-solid);
        }
        .verified-badge {
          position: absolute;
          bottom: 4px;
          right: 3px;
          width: 18px;
          height: 18px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-solid);
        }
        .user-info {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-weight: 700;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-username {
          font-size: 12px;
          color: #6b7280;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Navigation Links */
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 4px 0;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .nav-link:hover {
          background: rgba(37, 99, 235, 0.06);
          transform: translateX(2px);
        }
        .nav-link.active {
          background: rgba(37, 99, 235, 0.10);
          color: #3b82f6;
        }
        .nav-link.active .nav-icon {
          color: #3b82f6;
        }
        .nav-icon {
          font-size: 18px;
          flex-shrink: 0;
          color: #6b7280;
          transition: color 0.2s ease;
        }
        .nav-link:hover .nav-icon {
          color: #3b82f6;
        }
        .nav-label {
          flex: 1;
          font-size: 13px;
        }
        .nav-badge {
          font-size: 12px;
          background: rgba(37, 99, 235, 0.10);
          padding: 2px 8px;
          border-radius: 12px;
          color: #3b82f6;
          font-weight: 600;
        }

        /* ✅ Collapsible Pages Section */
        .pages-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .pages-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .pages-section-header:hover {
          background: rgba(37, 99, 235, 0.06);
        }

        .pages-section-title {
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pages-icon {
          font-size: 14px;
          color: #6b7280;
        }

        .pages-chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #6b7280;
          transition: transform 0.3s ease;
        }

        /* ✅ Pages links container with animation */
        .pages-links {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s ease, opacity 0.25s ease, margin 0.3s ease;
          margin-top: 0;
        }
        .pages-links.open {
          max-height: 600px;
          opacity: 1;
          margin-top: 4px;
        }
        .pages-links.closed {
          max-height: 0;
          opacity: 0;
          margin-top: 0;
        }

        .page-link {
          padding-left: 20px !important;
        }

        /* Action Section */
        .action-section {
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        .create-post-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
          width: 100%;
        }
        .create-post-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.30);
          color: white;
        }
        .create-post-btn:active {
          transform: translateY(0);
        }

        .auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .auth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .login-btn {
          background: rgba(37, 99, 235, 0.08);
          color: #3b82f6;
          border: 1px solid rgba(37, 99, 235, 0.12);
        }
        .login-btn:hover {
          background: rgba(37, 99, 235, 0.15);
        }
        .register-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }
        .register-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.30);
          color: white;
        }

        /* Footer */
        .sidebar-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid var(--line);
          font-size: 11px;
          color: #6b7280;
        }
        .footer-brand {
          font-weight: 700;
          color: var(--text);
        }
        .footer-version {
          opacity: 0.5;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .left-sidebar {
            padding: 0;
          }
          .sidebar-inner {
            padding: 10px 12px 12px 12px;
          }
          .nav-link {
            padding: 8px 10px;
            font-size: 13px;
          }
          .nav-icon {
            font-size: 16px;
          }
        }

        @media (max-width: 768px) {
          .left-sidebar {
            position: static;
            max-height: none;
            overflow-y: visible;
          }
          .sidebar-inner {
            border-radius: 12px;
            padding: 8px 10px 10px 10px;
          }
          .user-avatar {
            width: 38px;
            height: 38px;
          }
          .user-name {
            font-size: 13px;
          }
          .nav-link {
            padding: 6px 8px;
            font-size: 12px;
            gap: 10px;
          }
          .nav-icon {
            font-size: 15px;
          }
          .nav-label {
            font-size: 12px;
          }
          .create-post-btn {
            padding: 10px 14px;
            font-size: 13px;
          }
          .auth-btn {
            padding: 8px 14px;
            font-size: 13px;
          }
          .pages-section-header {
            padding: 4px 6px;
          }
          .pages-section-title {
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .left-sidebar {
            margin-bottom: 30px;
          }
          .sidebar-inner {
            padding: 6px 8px 8px 8px;
            border-radius: 10px;
          }
          .user-card-link {
            padding: 4px 6px;
          }
          .user-avatar {
            width: 34px;
            height: 34px;
          }
          .user-name {
            font-size: 12px;
          }
          .user-username {
            font-size: 10px;
          }
          .verified-badge {
            width: 15px;
            height: 15px;
            font-size: 8px;
          }
          .nav-link {
            padding: 5px 6px;
            font-size: 11px;
            gap: 8px;
            border-radius: 8px;
          }
          .nav-icon {
            font-size: 14px;
          }
          .nav-label {
            font-size: 11px;
          }
          .nav-badge {
            font-size: 10px;
            padding: 1px 6px;
          }
          .create-post-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
          .auth-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
          .sidebar-footer {
            font-size: 10px;
            padding-top: 8px;
          }
          .pages-section-header {
            padding: 3px 4px;
          }
          .pages-section-title {
            font-size: 10px;
          }
          .pages-chevron {
            font-size: 14px;
          }
          .page-link {
            padding-left: 14px !important;
          }
          .page-link .nav-label {
            font-size: 10px;
          }
        }

        /* Dark theme adjustments */
        [data-theme="dark"] .pages-section-title {
          color: #9ca3af;
        }
        [data-theme="dark"] .pages-section-header:hover {
          background: rgba(37, 99, 235, 0.10);
        }
        [data-theme="dark"] .pages-chevron {
          color: #6b7280;
        }
      `}</style>
    </aside>
  );
}
