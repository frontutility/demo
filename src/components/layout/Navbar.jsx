import {
  FiLogIn,
  FiMenu,
  FiPlus,
  FiUser,
  FiSearch
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import ThemeToggle from "../common/ThemeToggle";
import InstallAppButton from "../common/InstallAppButton";
import { getNavbarUsername, getProfilePath } from "../../utils/profile";
import { useNavigation } from "../../context/NavigationContext";

export default function Navbar({ onOpenLeft, onOpenRight }) {
  const { user } = useAuth();
  const { siteName, siteTagline, logoUrl } = useSiteSettings();
  const { isEnabled, itemsFor } = useNavigation();
  const dynamicHeaderLinks = itemsFor("header").filter((item) => !item.navKey.startsWith("header_") && (!item.authRequired || user.loggedIn));
  const navigate = useNavigate();
  const profileLabelFull = user.name || user.username || user.email || "Profile";
  const profileLabel = getNavbarUsername(profileLabelFull);
  const profileTarget = getProfilePath(user);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Left Section - Logo */}
        <div className="navbar-left">
          {isEnabled("header_home") && (
            <Link to="/" className="navbar-brand">
              <div className="logo-wrapper">
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="logo-image"
                />
              </div>
              <div className="brand-text">
                <div className="brand-name">{siteName}</div>
                <div className="brand-subtitle">{siteTagline}</div>
              </div>
            </Link>
          )}
        </div>

        {/* Center Section - Search (Desktop) */}
        {isEnabled("header_search") && (
          <div className="navbar-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search posts, people, villages..."
              onFocus={() => navigate("/search")}
            />
            <span className="search-shortcut">⌘K</span>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="navbar-actions">
          <ThemeToggle />
          <InstallAppButton />

          {user.loggedIn ? (
            <>
              {isEnabled("header_profile") && (
                <button
                  className="action-btn profile-btn"
                  type="button"
                  onClick={() => navigate(profileTarget)}
                  title={profileLabelFull}
                >
                  <FiUser />
                  <span className="profile-label">{profileLabel}</span>
                </button>
              )}
            </>
          ) : (
            <>
              {isEnabled("header_login") && (
                <button
                  className="action-btn login-btn"
                  type="button"
                  onClick={() => navigate("/login")}
                >
                  <FiLogIn />
                  <span>Login</span>
                </button>
              )}
              {isEnabled("header_register") && (
                <button
                  className="action-btn register-btn"
                  type="button"
                  onClick={() => navigate("/register")}
                >
                  <FiPlus />
                  <span>Register</span>
                </button>
              )}
            </>
          )}
          {dynamicHeaderLinks.map((item) => (
            <Link key={item.id || item.navKey} to={item.route} className="action-btn">{item.name}</Link>
          ))}
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 40;
          background: var(--bg-solid);
          border-bottom: 1px solid var(--line);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .navbar-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 64px;
        }

        /* Left Section */
        .navbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* Brand */
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          flex-shrink: 0;
        }

        .logo-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .logo-image {
          width: 44px;
          height: 44px;
          object-fit: cover;
        }

        .brand-text {
          line-height: 1.1;
        }

        .brand-name {
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.5px;
          color: var(--text);
        }

        .brand-subtitle {
          font-size: 11px;
          opacity: 0.5;
          font-weight: 500;
          letter-spacing: 0.3px;
          color: var(--text-secondary);
        }

        /* Search */
        .navbar-search {
          flex: 1;
          max-width: 520px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--bg-input, var(--bg-solid));
          transition: all 0.2s ease;
          position: relative;
        }

        .navbar-search:focus-within {
          border-color: rgba(var(--brand-2-rgb), 0.4);
          box-shadow: 0 0 0 4px rgba(var(--brand-2-rgb), 0.08);
        }

        .search-icon {
          font-size: 18px;
          color: var(--text-secondary);
          opacity: 0.5;
          flex-shrink: 0;
        }

        .navbar-search .search-input {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          width: 100%;
          height: 100%;
          color: var(--text);
          font-size: 14px;
        }

        .navbar-search .search-input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .search-shortcut {
          font-size: 11px;
          opacity: 0.3;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid var(--line);
          font-weight: 500;
          flex-shrink: 0;
          color: var(--text-secondary);
        }

        /* Actions */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 14px;
          height: 44px;
          border: none;
          border-radius: 10px;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          position: relative;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
          color: var(--text);
        }

        .action-btn svg {
          font-size: 20px;
          flex-shrink: 0;
        }

        .profile-btn {
          padding: 0 14px;
          height: 44px;
        }

        .profile-label {
          font-weight: 600;
          font-size: 13px;
        }

        .login-btn {
          padding: 0 14px;
          height: 40px;
          color: var(--brand-2);
        }

        .login-btn:hover {
          background: rgba(var(--brand-2-rgb), 0.08);
          color: var(--brand-2);
        }

        .register-btn {
          padding: 0 18px;
          height: 40px;
          background: linear-gradient(135deg, var(--brand-2), var(--brand));
          color: white;
          font-weight: 600;
          border: none;
        }

        .register-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--brand-2-rgb), 0.3);
        }

        /* Theme Toggle */
        .navbar-actions .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 20px;
          flex-shrink: 0;
        }

        .navbar-actions .theme-toggle:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
          color: var(--text);
        }

        .navbar-actions .theme-toggle svg {
          width: 20px;
          height: 20px;
        }

        /* ===== RESPONSIVE DESIGN ===== */

        /* Tablet Landscape */
        @media (max-width: 1024px) {
          .navbar-container {
            padding: 8px 16px;
            min-height: 56px;
            gap: 12px;
          }

          .navbar-search {
            max-width: 280px;
            height: 36px;
          }

          .search-shortcut {
            display: none;
          }

          .profile-label {
            display: none;
          }

          .action-btn {
            padding: 0 10px;
            height: 44px;
            font-size: 13px;
          }

          .profile-btn {
            padding: 0 10px;
            height: 44px;
          }

          .navbar-actions .theme-toggle {
            width: 36px;
            height: 36px;
          }

          .login-btn span,
          .register-btn span {
            display: inline;
          }
        }

        /* Tablet Portrait & Mobile Large */
        @media (max-width: 820px) {
          .navbar-container {
            padding: 8px 12px;
            min-height: 52px;
            gap: 10px;
          }

          .navbar-search {
            display: none;
          }

          .logo-image {
            width: 36px;
            height: 36px;
          }

          .brand-name {
            font-size: 16px;
          }

          .brand-subtitle {
            font-size: 10px;
          }

          .action-btn {
            padding: 0 8px;
            height: 44px;
            font-size: 12px;
          }

          .action-btn svg {
            font-size: 18px;
          }

          .profile-btn {
            padding: 0 8px;
            height: 44px;
          }

          .register-btn {
            padding: 0 12px;
            height: 32px;
          }

          .login-btn {
            padding: 0 10px;
            height: 32px;
          }

          .login-btn span,
          .register-btn span {
            display: inline;
            font-size: 12px;
          }

          .navbar-actions .theme-toggle {
            width: 32px;
            height: 32px;
          }

          .navbar-actions .theme-toggle svg {
            width: 18px;
            height: 18px;
          }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .navbar-container {
            padding: 6px 10px;
            min-height: 48px;
            gap: 8px;
          }

          .logo-image {
            width: 32px;
            height: 32px;
          }

          .brand-name {
            font-size: 14px;
          }

          .brand-subtitle {
            display: none;
          }

          .action-btn {
            padding: 0 6px;
            height: 44px;
            font-size: 12px;
          }

          .action-btn svg {
            font-size: 16px;
          }

          .profile-btn {
            padding: 0 6px;
            height: 44px;
            width: auto;
            min-width: 32px;
          }

          .login-btn span,
          .register-btn span {
            display: none;
          }

          .login-btn {
            padding: 0 8px;
            height: 32px;
            min-width: 32px;
          }

          .register-btn {
            padding: 0 8px;
            height: 32px;
            min-width: 32px;
          }

          .navbar-actions .theme-toggle {
            width: 32px;
            height: 32px;
          }

          .navbar-actions .theme-toggle svg {
            width: 16px;
            height: 16px;
          }
        }

        /* Very Small Mobile */
        @media (max-width: 400px) {
          .navbar-container {
            padding: 4px 6px;
            min-height: 44px;
            gap: 4px;
          }

          .logo-image {
            width: 28px;
            height: 28px;
          }

          .brand-name {
            font-size: 12px;
          }

          .action-btn {
            padding: 0 4px;
            height: 44px;
            min-width: 28px;
          }

          .action-btn svg {
            font-size: 14px;
          }

          .profile-btn {
            padding: 0 4px;
            height: 44px;
            min-width: 28px;
          }

          .login-btn,
          .register-btn {
            padding: 0 6px;
            height: 28px;
            min-width: 28px;
          }

          .navbar-actions .theme-toggle {
            width: 28px;
            height: 28px;
          }

          .navbar-actions .theme-toggle svg {
            width: 14px;
            height: 14px;
          }

          .navbar-actions {
            gap: 2px;
          }
            
        }
      `}</style>
    </header>
  );
}