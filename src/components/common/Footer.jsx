import { Link } from "react-router-dom";
import { 
  FiPlusCircle, 
  FiHome, 
  FiSearch, 
  FiLogIn, 
  FiUserPlus,
  FiInfo,
  FiMail,
  FiHelpCircle,
  FiShield,
  FiFileText,
  FiGithub,
  FiTwitter,
  FiInstagram,
  FiYoutube,
  FiHeart
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { useNavigation } from "../../context/NavigationContext";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const { siteName, siteTagline, siteDescription, logoUrl } = useSiteSettings();
  const { isEnabled } = useNavigation();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand Section */}
        <div className="footer-brand-section">
          <Link to="/" className="footer-brand-link">
            <img
              src={logoUrl}
              alt={siteName}
              className="footer-logo"
            />
            <div className="footer-brand-text">
              <div className="brand-name">{siteName}</div>
              <div className="brand-tagline">{siteTagline}</div>
            </div>
          </Link>
          <p className="footer-description">{siteDescription}</p>
          {/* <div className="footer-social">
            <a href="#" className="social-link" aria-label="Twitter">
              <FiTwitter />
            </a>
            <a href="#" className="social-link" aria-label="Instagram">
              <FiInstagram />
            </a>
            <a href="#" className="social-link" aria-label="YouTube">
              <FiYoutube />
            </a>
            <a href="#" className="social-link" aria-label="GitHub">
              <FiGithub />
            </a>
          </div> */}
        </div>

        {/* Footer Links Grid */}
        <div className="footer-links-grid">
          {/* Explore */}
          <div className="footer-links-group">
            <div className="group-title">Explore</div>
            {isEnabled("footer_home") && <Link to="/" className="footer-link">
              <FiHome className="link-icon" />
              Home
            </Link>}
            {isEnabled("footer_search") && <Link to="/search" className="footer-link">
              <FiSearch className="link-icon" />
              Explore Posts
            </Link>}
            {isEnabled("footer_news") && <Link to="/news" className="footer-link">
              <FiFileText className="link-icon" />
              News
            </Link>}
            {isEnabled("footer_login") && <Link to="/login" className="footer-link">
              <FiLogIn className="link-icon" />
              Login
            </Link>}
            {isEnabled("footer_register") && <Link to="/register" className="footer-link">
              <FiUserPlus className="link-icon" />
              Register
            </Link>}
          </div>

          {/* Company */}
          <div className="footer-links-group">
            <div className="group-title">Company</div>
            {isEnabled("footer_about") && <Link to="/pages/about-us" className="footer-link">
              <FiInfo className="link-icon" />
              About Us
            </Link>}
            {isEnabled("footer_contact") && <Link to="/pages/contact-us" className="footer-link">
              <FiMail className="link-icon" />
              Contact Us
            </Link>}
            {isEnabled("footer_help_center") && <Link to="/help-center" className="footer-link">
              <FiHelpCircle className="link-icon" />
              Help Center
            </Link>}
          </div>

          {/* Legal */}
          <div className="footer-links-group">
            <div className="group-title">Legal</div>
            {isEnabled("footer_privacy") && <Link to="/pages/privacy-policy" className="footer-link">
              <FiFileText className="link-icon" />
              Privacy Policy
            </Link>}
            {isEnabled("footer_terms") && <Link to="/pages/terms-conditions" className="footer-link">
              <FiFileText className="link-icon" />
              Terms & Conditions
            </Link>}
            {isEnabled("footer_guidelines") && <Link to="/pages/community-guidelines" className="footer-link">
              <FiShield className="link-icon" />
              Community Guidelines
            </Link>}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {user.loggedIn && isEnabled("footer_create_post") && (
        <div className="footer-action-bar">
          <div className="action-bar-inner">
            <span className="action-text">Share your thoughts with the community</span>
            <Link to="/post/new" className="create-post-btn">
              <FiPlusCircle />
              Create Post
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <span className="copyright">
            © {currentYear} {siteName}. All rights reserved.
          </span>
          <span className="made-with">
            Made with <FiHeart className="heart-icon" /> for the community
          </span>
        </div>
        <div className="footer-disclaimer">
          {siteName} is an independent community platform and is not affiliated
          with any government body, political party or public authority unless
          explicitly stated.
        </div>
      </div>

      <style>{`
        .site-footer {
          margin-top: 40px;
          border-top: 1px solid var(--line);
          background: var(--bg-solid);
          border-radius: 25px 25px 0 0;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px 32px 24px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
        }

        /* Brand Section */
        .footer-brand-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footer-brand-link {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: inherit;
        }

        .footer-logo {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          object-fit: cover;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.20);
        }

        .footer-brand-text {
          line-height: 1.2;
        }

        .brand-name {
          font-weight: 900;
          font-size: 20px;
          letter-spacing: -0.5px;
        }

        .brand-tagline {
          font-size: 13px;
          opacity: 0.6;
        }

        .footer-description {
          font-size: 14px;
          line-height: 1.7;
          opacity: 0.7;
          max-width: 420px;
          margin: 0;
        }

        .footer-social {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--line);
          color: var(--text-secondary);
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .social-link:hover {
          border-color: rgba(37, 99, 235, 0.3);
          color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.10);
        }

        .social-link svg {
          font-size: 18px;
        }

        /* Links Grid */
        .footer-links-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .footer-links-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .group-title {
          font-weight: 700;
          font-size: 14px;
          padding-bottom: 6px;
          margin-bottom: 4px;
          border-bottom: 2px solid rgba(37, 99, 235, 0.08);
        }

        .footer-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .footer-link:hover {
          background: rgba(37, 99, 235, 0.06);
          color: #3b82f6;
          transform: translateX(4px);
        }

        .footer-link .link-icon {
          font-size: 14px;
          opacity: 0.5;
        }

        .footer-link:hover .link-icon {
          opacity: 1;
        }

        /* Action Bar */
        .footer-action-bar {
          border-top: 1px solid var(--line);
          padding: 16px 24px;
          background: rgba(37, 99, 235, 0.03);
        }

        .action-bar-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .action-text {
          font-size: 14px;
          font-weight: 500;
          opacity: 0.7;
        }

        .create-post-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .create-post-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.35);
          color: white;
        }

        .create-post-btn:active {
          transform: translateY(0);
        }

        .create-post-btn svg {
          font-size: 20px;
        }

        /* Bottom Bar */
        .footer-bottom {
          padding: 16px 24px 20px 24px;
          border-top: 1px solid var(--line);
        }

        .footer-bottom-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .copyright {
          font-size: 13px;
          opacity: 0.6;
        }

        .made-with {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          opacity: 0.6;
        }

        .heart-icon {
          color: #ef4444;
          animation: heartBeat 2s ease-in-out infinite;
        }

        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .footer-disclaimer {
          max-width: 1200px;
          margin: 12px auto 0 auto;
          font-size: 11px;
          opacity: 0.4;
          text-align: center;
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 968px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 32px 20px 24px 20px;
          }

          .footer-description {
            max-width: 100%;
          }

          .footer-links-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .footer-container {
            padding: 24px 16px 20px 16px;
          }

          .footer-links-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .footer-brand-link {
            gap: 10px;
          }

          .footer-logo {
            width: 42px;
            height: 42px;
          }

          .brand-name {
            font-size: 18px;
          }

          .action-bar-inner {
            flex-direction: column;
            text-align: center;
          }

          .create-post-btn {
            width: 100%;
            justify-content: center;
          }

          .footer-bottom-inner {
            flex-direction: column;
            text-align: center;
          }

          .made-with {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .footer-container {
            padding: 20px 12px 16px 12px;
          }

          .footer-links-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .footer-logo {
            width: 36px;
            height: 36px;
          }

          .brand-name {
            font-size: 16px;
          }

          .brand-tagline {
            font-size: 11px;
          }

          .footer-description {
            font-size: 13px;
          }

          .group-title {
            font-size: 13px;
          }

          .footer-link {
            font-size: 12px;
            padding: 4px 6px;
          }

          .footer-social {
            gap: 6px;
          }

          .social-link {
            width: 34px;
            height: 34px;
          }

          .social-link svg {
            font-size: 16px;
          }

          .action-text {
            font-size: 13px;
          }

          .create-post-btn {
            padding: 8px 20px;
            font-size: 13px;
          }

          .copyright {
            font-size: 11px;
          }

          .made-with {
            font-size: 11px;
          }

          .footer-disclaimer {
            font-size: 10px;
          }
        }
      `}</style>
    </footer>
  );
}
