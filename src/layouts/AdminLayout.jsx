import { useEffect, useMemo, useState } from "react";
import { formatCount } from "../utils/formatters";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiBriefcase, FiChevronLeft, FiChevronRight, FiFileText, FiHeart, FiHelpCircle, FiHome, FiLogOut, FiMail, FiMapPin, FiMenu, FiSettings, FiShield, FiSliders, FiTag, FiUser, FiUsers } from "react-icons/fi";
import { AdminUIProvider } from "../admin/context/AdminUIContext";
import AdminToast from "../admin/components/AdminToast";
import AdminConfirmationModal from "../admin/components/AdminConfirmationModal";
import api from "../services/api";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: <FiHome /> },
  { to: "/admin/users", label: "Users", icon: <FiUsers /> },
  { to: "/admin/deleted-users", label: "Deleted Users", icon: <FiUsers /> },
  { to: "/admin/posts", label: "Posts", icon: <FiFileText /> },
  { to: "/admin/polls", label: "Polls", icon: <FiFileText /> },
  { to: "/admin/villages", label: "Villages", icon: <FiMapPin /> },
  { to: "/admin/business-directory", label: "Business Directory", icon: <FiBriefcase /> },
  { to: "/admin/business-categories", label: "Business Categories", icon: <FiTag /> },
  { to: "/admin/post-reports", label: "Post Reports", icon: <FiAlertTriangle /> },
  { to: "/admin/user-reports", label: "User Reports", icon: <FiAlertTriangle /> },
  { to: "/admin/blue-ticks", label: "Blue Ticks", icon: <FiShield /> },
  { to: "/admin/news", label: "News", icon: <FiFileText /> },
  { to: "/admin/help-center", label: "Help Center", icon: <FiHelpCircle /> },
  { to: "/admin/contact-requests", label: "Contact Requests", icon: <FiMail /> },
  { to: "/admin/settings", label: "Settings", icon: <FiSettings /> },
  { to: "/admin/navigation", label: "Navigation Management", icon: <FiSliders /> },
  { to: "/admin/cms", label: "CMS", icon: <FiSliders /> },
  { to: "/admin/donation-settings", label: "Donation Settings", icon: <FiHeart /> },
];

const authKeysToClear = [
  "token",
  "authToken",
  "accessToken",
  "refreshToken",
  "adminUser",
  "adminToken",
  "user",
  "session",
];

function clearAuthStorage() {
  authKeysToClear.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const adminUserRaw = localStorage.getItem("adminUser") || sessionStorage.getItem("adminUser");
  const [userCounts, setUserCounts] = useState({ active: 0, deleted: 0 });

  useEffect(() => {
    function fetchCounts() {
      if (adminUserRaw) {
        api.get("/api/admin/users/counts")
          .then((res) => {
            const data = res.data?.data ?? res.data ?? { active: 0, deleted: 0 };
            setUserCounts({
              active: typeof data.active === "number" ? data.active : 0,
              deleted: typeof data.deleted === "number" ? data.deleted : 0,
            });
          })
          .catch(() => {});
      }
    }

    fetchCounts();

    window.addEventListener("admin-user-counts-update", fetchCounts);
    return () => {
      window.removeEventListener("admin-user-counts-update", fetchCounts);
    };
  }, [adminUserRaw, location.pathname]);
  const adminUser = useMemo(() => {
    if (!adminUserRaw) return null;
    try {
      return JSON.parse(adminUserRaw);
    } catch (error) {
      return null;
    }
  }, [adminUserRaw]);

  useEffect(() => {
    document.title = "ConnectNKT Admin";
  }, []);

  if (!adminUserRaw && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace />;
  }

  const contextValue = useMemo(
    () => ({
      toast,
      showToast: (nextToast) => {
        setToast(nextToast);
        window.clearTimeout(window.__adminToastTimer);
        window.__adminToastTimer = window.setTimeout(() => setToast(null), 2800);
      },
    }),
    [toast]
  );

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  return (
    <AdminUIProvider value={contextValue}>
      <div className={`admin-shell ${sidebarCollapsed ? "collapsed" : ""}`}>
        <header className="admin-navbar">
          <div className="admin-navbar-brand">
            <button type="button" className="admin-icon-btn admin-mobile-toggle" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle sidebar">
              <FiMenu />
            </button>
            <div className="admin-logo-mark">C</div>
            <div>
              <div className="admin-title">ConnectNKT Admin</div>
              <div className="admin-subtitle">Operations console</div>
            </div>
          </div>

          <div className="admin-navbar-actions">
            <div className="admin-profile-pill">
              <div className="admin-profile-avatar">
                <FiUser />
              </div>
              <div>
                <strong>{adminUser?.name || adminUser?.username || "Admin"}</strong>
                <div>{adminUser?.role || "Super Admin"}</div>
              </div>
            </div>
            <button type="button" className="admin-logout-btn" onClick={handleLogout} disabled={isLoggingOut}>
              <FiLogOut />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        <div className={`admin-backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="admin-sidebar-head">
            <div className="admin-sidebar-brand">
              <div className="admin-logo-mark small">C</div>
              <div>
                <strong>ConnectNKT</strong>
                <div>Admin controls</div>
              </div>
            </div>
            <div className="admin-sidebar-head-actions">
              <button type="button" className="admin-icon-btn admin-sidebar-collapse-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
              </button>
              <button type="button" className="admin-icon-btn admin-mobile-toggle" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                <FiMenu />
              </button>
            </div>
          </div>
          <nav className="admin-nav">
            {adminLinks.map((link) => {
              const hasBadge = link.to === "/admin/users" || link.to === "/admin/deleted-users";
              const badgeVal = link.to === "/admin/users" ? userCounts.active : link.to === "/admin/deleted-users" ? userCounts.deleted : 0;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/admin"}
                  className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`.trim()}
                  onClick={() => setSidebarOpen(false)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {hasBadge && badgeVal > 0 && (
                    <span className="admin-nav-badge">{formatCount(badgeVal)}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <AdminConfirmationModal
          open={showLogoutConfirm}
          title="Logout"
          message="Are you sure you want to logout from admin?"
          confirmLabel="Logout"
          cancelLabel="Cancel"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            setIsLoggingOut(true);
            try {
              clearAuthStorage();
              setToast({
                type: "success",
                title: "Logged out",
                message: "Admin session cleared successfully.",
              });
              navigate("/admin/login", { replace: true });
            } finally {
              setIsLoggingOut(false);
            }
          }}
          onClose={() => setShowLogoutConfirm(false)}
          loading={isLoggingOut}
        />

        <main className="admin-content">
          <Outlet context={{ showToast: contextValue.showToast }} />
        </main>

        <AdminToast toast={toast} />
      </div>

      <style>{`
        .admin-shell {
          min-height: 100vh;
          overflow-x: hidden;
          background: var(--bg-solid);
          color: var(--text);
        }

        /* Navbar */
        .admin-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 20px;
          z-index: 70;
          background: var(--bg-solid);
          border-bottom: 1px solid var(--line);
          backdrop-filter: blur(12px);
        }

        .admin-navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-logo-mark {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 20px;
          color: #fff;
          background: linear-gradient(135deg, var(--brand-2), var(--brand));
          box-shadow: 0 4px 16px rgba(var(--brand-2-rgb), 0.3);
          flex-shrink: 0;
        }

        .admin-logo-mark.small {
          width: 36px;
          height: 36px;
          font-size: 16px;
        }

        .admin-title {
          font-weight: 700;
          font-size: 16px;
          line-height: 1.2;
          color: var(--text);
        }

        .admin-subtitle {
          color: var(--text-secondary);
          font-size: 12px;
          opacity: 0.6;
        }

        .admin-navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-profile-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 6px;
          border-radius: 99px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
        }

        .admin-profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--brand-2-rgb), 0.1);
          color: var(--brand-2);
        }

        .admin-profile-pill strong {
          font-size: 13px;
        }

        .admin-profile-pill div div {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
        }

        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(var(--danger-rgb), 0.2);
          background: rgba(var(--danger-rgb), 0.06);
          color: var(--danger);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-logout-btn:hover {
          background: rgba(var(--danger-rgb), 0.12);
          transform: translateY(-1px);
        }

        .admin-logout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Backdrop */
        .admin-backdrop {
          display: none;
          position: fixed;
          inset: 64px 0 0 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 55;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .admin-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        /* Sidebar */
        .admin-sidebar {
          position: fixed;
          top: 64px;
          left: 0;
          bottom: 0;
          width: 240px;
          padding: 16px 12px;
          background: var(--bg-solid);
          border-right: 1px solid var(--line);
          overflow-y: auto;
          z-index: 60;
          transition: width 0.2s ease, transform 0.25s ease;
        }

        .admin-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .admin-sidebar::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 10px;
        }

        .admin-sidebar-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }

        .admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-sidebar-brand strong {
          font-size: 14px;
        }

        .admin-sidebar-brand div div {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .admin-sidebar-head-actions {
          display: flex;
          gap: 6px;
        }

        .admin-sidebar-collapse-toggle {
          display: flex;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.15s ease;
        }

        .admin-nav-link:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
          color: var(--text);
        }

        .admin-nav-link.active {
          background: rgba(var(--brand-2-rgb), 0.08);
          color: var(--brand-2);
        }

        .admin-nav-link svg {
          font-size: 18px;
          flex-shrink: 0;
        }

        .admin-nav-link span {
          flex: 1;
        }

        .admin-nav-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          color: #fff;
          background-color: var(--brand-2);
          border-radius: 99px;
          margin-left: auto;
          flex-shrink: 0;
        }

        .admin-shell.collapsed .admin-nav-badge {
          display: none;
        }

        /* Collapsed Sidebar */
        .admin-shell.collapsed .admin-sidebar {
          width: 68px;
        }

        .admin-shell.collapsed .admin-sidebar-brand div {
          display: none;
        }

        .admin-shell.collapsed .admin-nav-link span {
          display: none;
        }

        .admin-shell.collapsed .admin-nav-link {
          justify-content: center;
          padding: 10px;
        }

        .admin-shell.collapsed .admin-sidebar-collapse-toggle {
          display: none;
        }

        .admin-shell.collapsed .admin-content {
          margin-left: 68px;
        }

        /* Content */
        .admin-content {
          margin-left: 240px;
          padding-top: 80px;
          padding-left: 20px;
          padding-right: 20px;
          padding-bottom: 20px;
          min-height: 100vh;
        }

        .admin-content > div {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Icon Button */
        .admin-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .admin-icon-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
          color: var(--text);
        }

        .admin-mobile-toggle {
          display: none;
        }

        /* Toast */
        .admin-toast {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 100;
          min-width: 280px;
          max-width: 400px;
          padding: 16px 20px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .admin-toast.success {
          border-color: rgba(16, 185, 129, 0.25);
        }

        .admin-toast.error {
          border-color: rgba(239, 68, 68, 0.25);
        }

        .admin-toast strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .admin-toast p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          opacity: 0.7;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .admin-content {
            padding-left: 16px;
            padding-right: 16px;
          }
        }

        @media (max-width: 768px) {
          .admin-navbar {
            height: 60px;
            padding: 0 14px;
          }

          .admin-title {
            font-size: 14px;
          }

          .admin-subtitle {
            display: none;
          }

          .admin-logo-mark {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .admin-profile-pill {
            display: none;
          }

          .admin-logout-btn span {
            display: none;
          }

          .admin-logout-btn {
            padding: 8px 12px;
          }

          .admin-mobile-toggle {
            display: flex !important;
          }

          .admin-backdrop {
            display: block;
          }

          .admin-sidebar {
            left: -280px;
            width: 280px;
            border-radius: 0 16px 16px 0;
            box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12);
          }

          .admin-sidebar.open {
            left: 0;
          }

          .admin-content {
            margin-left: 0;
            padding-top: 76px;
            padding-left: 12px;
            padding-right: 12px;
          }

          .admin-shell.collapsed .admin-content {
            margin-left: 0;
          }

          .admin-sidebar-collapse-toggle {
            display: none;
          }

          .admin-toast {
            right: 12px;
            bottom: 12px;
            min-width: 220px;
            max-width: calc(100% - 24px);
          }
        }

        @media (max-width: 480px) {
          .admin-navbar {
            height: 56px;
            padding: 0 10px;
          }

          .admin-title {
            font-size: 12px;
          }

          .admin-logo-mark {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .admin-content {
            padding-top: 70px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .admin-sidebar {
            width: 260px;
            left: -260px;
            padding: 12px 10px;
          }

          .admin-sidebar.open {
            left: 0;
          }

          .admin-nav-link {
            padding: 8px 12px;
            font-size: 13px;
          }

          .admin-logout-btn {
            padding: 6px 10px;
            font-size: 12px;
          }

          .admin-toast {
            right: 8px;
            bottom: 8px;
            min-width: 200px;
            padding: 12px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </AdminUIProvider>
  );
}
