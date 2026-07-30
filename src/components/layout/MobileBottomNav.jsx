import { 
  FiHome, 
  FiMenu, 
  FiSearch, 
  FiPlus, 
  FiUser, 
  FiLogIn, 
  FiUserPlus,
  FiCompass,
  FiHeart,
  FiBell
} from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProfilePath } from "../../utils/profile";
import { useNavigation } from "../../context/NavigationContext";

export default function MobileBottomNav({ onOpenLeft, onOpenRight }) {
  const navigate = useNavigate();
  const { user, unreadCount, refreshNotifications } = useAuth();
  const profilePath = user.loggedIn ? getProfilePath(user) : "/login";
  const { isEnabled } = useNavigation();

  return (
    <>
      <nav className="mobile-bottom-nav">
        {isEnabled("mobile_home") && <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <span className="nav-icon"><FiHome /></span>
          <span className="nav-label">Home</span>
        </NavLink>}

        {isEnabled("mobile_search") && <button type="button" className="nav-item" onClick={() => navigate("/search")}>
          <span className="nav-icon"><FiSearch /></span>
          <span className="nav-label">Search</span>
        </button>}

        {user.loggedIn && isEnabled("mobile_create_post") ? (
          <button type="button" className="nav-item nav-create" onClick={() => navigate("/post/new")}>
            <span className="create-icon"><FiPlus /></span>
            <span className="create-label">New</span>
          </button>
        ) : !user.loggedIn && isEnabled("mobile_join") ? (
          <button type="button" className="nav-item nav-create" onClick={() => navigate("/register")}>
            <span className="create-icon"><FiUserPlus /></span>
            <span className="create-label">Join</span>
          </button>
        ) : null}

        {user.loggedIn && (
          <button type="button" className="nav-item" onClick={() => navigate("/notifications")}>
            <span className="nav-icon notif-mobile-icon">
              <FiBell />
              {unreadCount > 0 && (
                <span className="notif-mobile-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </span>
            <span className="nav-label">Alerts</span>
          </button>
        )}

        {user.loggedIn && isEnabled("mobile_profile") ? (
          <button type="button" className="nav-item" onClick={() => navigate(profilePath)}>
            <span className="nav-icon"><FiUser /></span>
            <span className="nav-label">Profile</span>
          </button>
        ) : !user.loggedIn && isEnabled("mobile_login") ? (
          <button type="button" className="nav-item" onClick={() => navigate("/login")}>
            <span className="nav-icon"><FiLogIn /></span>
            <span className="nav-label">Login</span>
          </button>
        ) : null}

        {isEnabled("mobile_menu") && <button type="button" className="nav-item nav-menu" onClick={onOpenLeft}>
          <span className="nav-icon"><FiMenu /></span>
          <span className="nav-label">Menu</span>
        </button>}
      </nav>

      <style>{`
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: none;
          justify-content: space-around;
          align-items: center;
          padding: 6px 0 env(safe-area-inset-bottom, 6px) 0;
          background: var(--bg-solid);
          border-top: 1px solid var(--line);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(var(--bg-rgb, 255,255,255), 0.92);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 6px 12px;
          min-width: 52px;
          border: none;
          background: none;
          color: var(--text-secondary, #6b7280);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          border-radius: 12px;
          font-family: inherit;
        }

        .nav-item .nav-icon {
          font-size: 22px;
          line-height: 1;
          transition: transform 0.2s ease;
        }

        .nav-item .nav-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.2s ease;
        }

        .nav-item:hover .nav-icon {
          transform: translateY(-1px);
        }

        .notif-mobile-icon {
          position: relative;
          display: inline-flex;
        }

        .notif-mobile-badge {
          position: absolute;
          top: -4px;
          right: -6px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          font-size: 9px;
          font-weight: 700;
          line-height: 16px;
          text-align: center;
          color: #fff;
          background: #ef4444;
          border-radius: 8px;
          border: 1.5px solid var(--bg-solid);
        }

        .nav-item.active {
          color: #3b82f6;
        }

        .nav-item.active .nav-icon {
          transform: scale(1.05);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          border-radius: 0 0 4px 4px;
          background: #3b82f6;
        }

        /* Create Button */
        .nav-create {
          position: relative;
          margin-top: -16px;
        }

        .create-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          font-size: 26px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
        }

        .create-icon:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 24px rgba(37, 99, 235, 0.45);
        }

        .create-icon:active {
          transform: scale(0.95);
        }

        .create-label {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-secondary, #6b7280);
          margin-top: 2px;
        }

        .nav-create.active .create-icon {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.5);
        }

        /* Menu button with dots indicator */
        .nav-menu .nav-icon {
          position: relative;
        }

        .nav-menu .nav-icon::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -6px;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          border: 1px solid var(--bg-solid);
        }

        /* Show on mobile */
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .mobile-bottom-nav {
            padding: 4px 0 env(safe-area-inset-bottom, 4px) 0;
          }

          .nav-item {
            padding: 4px 8px;
            min-width: 44px;
          }

          .nav-item .nav-icon {
            font-size: 19px;
          }

          .nav-item .nav-label {
            font-size: 9px;
          }

          .create-icon {
            width: 44px;
            height: 44px;
            font-size: 22px;
          }

          .create-label {
            font-size: 8px;
          }

          .nav-create {
            margin-top: -12px;
          }

          .nav-item.active::before {
            width: 16px;
            height: 2px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-bottom-nav {
            background: rgba(var(--bg-rgb, 18, 18, 18), 0.95);
            border-top-color: rgba(255, 255, 255, 0.06);
          }
        }

        /* When sidebar is open, hide bottom nav */
        .sidebar-open .mobile-bottom-nav {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        /* Safe area for notched phones */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .mobile-bottom-nav {
            padding-bottom: env(safe-area-inset-bottom, 6px);
          }
        }
      `}</style>
    </>
  );
}
