import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FiBriefcase, FiMapPin, FiPhone, FiMail, FiGlobe, 
  FiShare2, FiClock, FiCalendar, FiAward, FiUsers,
  FiFacebook, FiInstagram, FiYoutube, FiExternalLink,
  FiInfo, FiFileText, FiTag, FiMessageCircle, FiSearch, FiX
} from "react-icons/fi";
import { HiBadgeCheck } from "react-icons/hi";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/profile";
import { formatCount } from "../../utils/formatters";

function formatTime(value) {
  if (!value) return "Not set";
  return String(value).slice(0, 5);
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followersHasMore, setFollowersHasMore] = useState(false);
  const [followersSearch, setFollowersSearch] = useState("");
  const [followersLoading, setFollowersLoading] = useState(false);

  useEffect(() => {
    document.title = business?.business_name 
      ? `${business.business_name} | ConnectNKT` 
      : "ConnectNKT | Business Details";
  }, [business]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get(`/api/business/details/${id}`);
        setBusiness(response?.data?.data || response?.data || null);
      } catch (error) {
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleFollow() {
    setFollowLoading(true);
    try {
      const endpoint = `/api/business/${id}/follow`;
      const response = business.is_following ? await api.delete(endpoint) : await api.post(endpoint);
      const state = response?.data?.data || response?.data || {};
      setBusiness((current) => ({ ...current, ...state, is_following: !business.is_following }));
    } catch (error) {
      if (error?.response?.status === 401) navigate("/login", { state: { from: `/business/${id}` } });
    } finally {
      setFollowLoading(false);
    }
  }

  async function loadFollowers(page = 1, append = false) {
    setFollowersLoading(true);
    try {
      const response = await api.get(`/api/business/${id}/followers`, { params: { page, limit: 20, search: followersSearch } });
      const data = response?.data?.data || response?.data || {};
      setFollowers((current) => append ? [...current, ...(data.followers || [])] : (data.followers || []));
      setFollowersPage(data.page || page);
      setFollowersHasMore(Boolean(data.has_more));
    } finally {
      setFollowersLoading(false);
    }
  }

  function openFollowers() {
    setFollowersOpen(true);
    setFollowersPage(1);
    loadFollowers(1, false);
  }

  const socialLinks = useMemo(() => [
    business?.facebook ? { 
      label: "Facebook", 
      href: business.facebook, 
      icon: FiFacebook,
      color: "#1877f2"
    } : null,
    business?.instagram ? { 
      label: "Instagram", 
      href: business.instagram, 
      icon: FiInstagram,
      color: "#e4405f"
    } : null,
    business?.youtube ? { 
      label: "YouTube", 
      href: business.youtube, 
      icon: FiYoutube,
      color: "#ff0000"
    } : null,
    business?.website ? { 
      label: "Website", 
      href: business.website, 
      icon: FiExternalLink,
      color: "#667eea"
    } : null,
  ].filter(Boolean), [business]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ 
        title: business?.business_name || "Business", 
        text: `Check out ${business?.business_name || "this business"} on ConnectNKT`, 
        url 
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  if (loading) {
    return (
      <div className="business-detail-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading business details...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="business-detail-page">
        <div className="not-found-container">
          <div className="not-found-icon">ðŸ”</div>
          <h2>Business Not Found</h2>
          <p>The business you're looking for doesn't exist or has been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/businesses')}>
            Browse Businesses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="business-detail-page">
      {/* Header Section */}
      <div className="business-header">
        <div className="header-content">
          <div className="business-logo-container">
            <div className="business-logo">
              {business.logo_url ? (
                <img src={resolveMediaUrl(business.logo_url)} alt={business.business_name} />
              ) : (
                <FiBriefcase />
              )}
            </div>
          </div>

          <div className="business-info">
            <div className="business-name-wrapper">
              <h1 className="business-name">{business.business_name}</h1>
              {business.is_verified && (
                <span className="verified-tag" title="Verified Business">
                  <HiBadgeCheck className="username-badge-icon" color="#2563eb" size={20} title="Verified" />
                </span>
              )}
            </div>
            
            {business.tagline && (
              <p className="business-tagline">{business.tagline}</p>
            )}

            <div className="business-meta">
              <span className="meta-item">
                <FiMapPin />
                {business.village_name || business.address || "Location not specified"}
              </span>
              {business.category_name && (
                <span className="meta-item">
                  <FiTag />
                  {business.category_name}
                </span>
              )}
            </div>

            <div className="business-actions">
              <button className="btn btn-secondary" onClick={handleShare}>
                <FiShare2 /> Share
              </button>
              <button className={`btn ${business.is_following ? "btn-secondary" : "btn-primary"}`} onClick={handleFollow} disabled={followLoading}>
                {followLoading ? "Please wait..." : business.is_following ? "Following" : "Follow"}
              </button>
              <button className="btn btn-secondary" onClick={openFollowers}>
                <FiUsers /> {formatCount(business.followers_count || 0)} Followers
              </button>
              {business.phone && (
                <a href={`tel:${business.phone}`} className="btn btn-primary">
                  <FiPhone /> Contact
                </a>
              )}
              {business.phone && (
                <a 
                  href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <FiMessageCircle /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="social-links">
            {socialLinks.map((social) => (
              <a 
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                style={{ '--social-color': social.color }}
                title={`Visit ${social.label}`}
              >
                <social.icon />
                <span>{social.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {followersOpen && (
        <div className="followers-overlay" role="dialog" aria-modal="true">
          <div className="followers-modal">
            <div className="followers-modal-header">
              <div><h2>Followers</h2><p>{formatCount(business.followers_count || 0)} followers</p></div>
              <button type="button" className="icon-close" onClick={() => setFollowersOpen(false)}><FiX /></button>
            </div>
            <form className="followers-search" onSubmit={(event) => { event.preventDefault(); loadFollowers(1, false); }}>
              <FiSearch /><input value={followersSearch} onChange={(event) => setFollowersSearch(event.target.value)} placeholder="Search followers" />
            </form>
            <div className="followers-list">
              {followers.map((follower) => (
                <div className="follower-row" key={follower.id}>
                  {follower.profile_image_url ? <img src={resolveMediaUrl(follower.profile_image_url)} alt="" /> : <div className="follower-avatar">{(follower.name || "?").charAt(0).toUpperCase()}</div>}
                  <div><strong>{follower.name}</strong><span>@{follower.username} Â· {follower.village_name || "Village not set"}</span></div>
                </div>
              ))}
              {!followersLoading && !followers.length && <p className="empty-followers">No followers found.</p>}
            </div>
            {followersLoading && <p className="followers-loading">Loading followers...</p>}
            {!followersLoading && followersHasMore && <button type="button" className="btn btn-secondary load-more-followers" onClick={() => loadFollowers(followersPage + 1, true)}>Load more</button>}
          </div>
        </div>
      )}

      {/* Main Content - Full Width */}
      <div className="business-content">
        {/* About Section */}
        <section className="info-section">
          <h2 className="section-title">
            <FiInfo /> About
          </h2>
          <p className="business-description">
            {business.description || "No description provided."}
          </p>
        </section>

        {/* Contact & Hours */}
        <section className="info-section">
          <h2 className="section-title">
            <FiClock /> Contact & Hours
          </h2>
          <div className="contact-grid">
            <div className="contact-item">
              <FiPhone className="contact-icon" />
              <div>
                <label>Phone</label>
                <a href={`tel:${business.phone}`}>{business.phone || "Not provided"}</a>
              </div>
            </div>
            <div className="contact-item">
              <FiMessageCircle className="contact-icon" style={{ color: '#25d366' }} />
              <div>
                <label>WhatsApp</label>
                {business.phone ? (
                  <a 
                    href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {business.phone}
                  </a>
                ) : (
                  <p>Not provided</p>
                )}
              </div>
            </div>
            <div className="contact-item">
              <FiMail className="contact-icon" />
              <div>
                <label>Email</label>
                <a href={`mailto:${business.email}`}>{business.email || "Not provided"}</a>
              </div>
            </div>
            <div className="contact-item">
              <FiMapPin className="contact-icon" />
              <div>
                <label>Address</label>
                <p>{business.address || "Not provided"}</p>
              </div>
            </div>
            <div className="contact-item">
              <FiGlobe className="contact-icon" />
              <div>
                <label>Website</label>
                {business.website ? (
                  <a href={business.website} target="_blank" rel="noopener noreferrer">
                    {business.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <p>Not provided</p>
                )}
              </div>
            </div>
            <div className="contact-item">
              <FiClock className="contact-icon" />
              <div>
                <label>Business Hours</label>
                <p>
                  {formatTime(business.opening_time)} - {formatTime(business.closing_time)}
                </p>
              </div>
            </div>
            <div className="contact-item">
              <FiCalendar className="contact-icon" />
              <div>
                <label>Days Open</label>
                <p>
                  {Array.isArray(business.days_open) && business.days_open.length 
                    ? business.days_open.join(", ") 
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services & Offers */}
        {(business.services || business.offers) && (
          <section className="info-section">
            <h2 className="section-title">
              <FiBriefcase /> Services & Offers
            </h2>
            <div className="services-grid">
              {business.services && (
                <div className="service-item">
                  <h4>Services</h4>
                  <p>{business.services}</p>
                </div>
              )}
              {business.offers && (
                <div className="service-item">
                  <h4>Special Offers</h4>
                  <p>{business.offers}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Business Documents */}
        {(business.business_license || business.gst_number) && (
          <section className="info-section">
            <h2 className="section-title">
              <FiFileText /> Business Documents
            </h2>
            <div className="documents-grid">
              {business.business_license && (
                <div className="doc-item">
                  <FiAward />
                  <div>
                    <label>Business License</label>
                    <p>{business.business_license}</p>
                  </div>
                </div>
              )}
              {business.gst_number && (
                <div className="doc-item">
                  <FiFileText />
                  <div>
                    <label>GST Number</label>
                    <p>{business.gst_number}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <style>{`
        /* Reset and Base */
        .business-detail-page {
          max-width: 1280px;
          margin: 0 auto;
          // padding: 30px 24px 60px;
          width: 100%;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 20px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(102, 126, 234, 0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Not Found */
        .not-found-container {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-elevated);
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .not-found-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .not-found-container h2 {
          margin: 0 0 12px;
          font-size: 28px;
        }

        .not-found-container p {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.25s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
        }

        .btn-secondary {
          background: var(--bg-soft);
          color: var(--text-primary);
          border: 1px solid rgba(0,0,0,0.08);
        }

        .btn-secondary:hover {
          background: rgba(102, 126, 234, 0.08);
          transform: translateY(-2px);
        }

        .btn-whatsapp {
          background: #25d366;
          color: white;
          box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);
        }

        .btn-whatsapp:hover {
          background: #1da851;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45);
        }

        /* Header */
        .business-header {
          background: var(--bg-elevated);
          border-radius: 24px;
          padding: 32px 36px;
          margin-bottom: 12px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
        }

        .header-content {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }

        .business-logo-container {
          position: relative;
          flex-shrink: 0;
        }

        .business-logo {
          width: 120px;
          height: 120px;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44px;
          color: var(--text-secondary);
          border: 2px solid rgba(0,0,0,0.04);
        }

        .business-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .verified-badge {
          position: absolute;
          bottom: -6px;
          right: -6px;
          background: #10b981;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .business-info {
          flex: 1;
          min-width: 0;
        }

        .business-name-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .business-name {
          margin: 0;
          font-size: clamp(26px, 3.5vw, 38px);
          line-height: 1.1;
          font-weight: 700;
          color: var(--text-primary);
        }

        .verified-tag {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          // padding: 4px 14px;
          border-radius: 999px;
          // background: #10b981;
          color: white;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-top: 4px;
        }

        .business-tagline {
          font-size: 16px;
          color: var(--text-secondary);
          margin: 6px 0 12px;
          max-width: 600px;
          line-height: 1.6;
        }

        .business-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 24px;
          margin-bottom: 20px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .meta-item svg {
          color: #667eea;
          flex-shrink: 0;
        }

        .business-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .followers-overlay { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:20px; }
        .followers-modal { width:min(520px,100%); max-height:min(680px,90vh); overflow:auto; background:var(--bg-elevated); border-radius:20px; padding:22px; box-shadow:0 20px 60px rgba(15,23,42,.25); }
        .followers-modal-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
        .followers-modal-header h2 { margin:0; font-size:22px; } .followers-modal-header p { margin:4px 0 16px; color:var(--text-secondary); }
        .icon-close { border:0; background:var(--bg-soft); border-radius:10px; padding:8px; cursor:pointer; color:var(--text-primary); }
        .followers-search { display:flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:12px; padding:0 12px; margin-bottom:12px; }
        .followers-search input { border:0; outline:0; padding:11px 0; flex:1; background:transparent; color:var(--text-primary); }
        .follower-row { display:flex; gap:12px; align-items:center; padding:11px 0; border-bottom:1px solid var(--line); }
        .follower-row img, .follower-avatar { width:40px; height:40px; border-radius:50%; object-fit:cover; background:#e0e7ff; display:grid; place-items:center; color:#4f46e5; font-weight:700; }
        .follower-row strong, .follower-row span { display:block; } .follower-row span { color:var(--text-secondary); font-size:13px; margin-top:3px; }
        .empty-followers, .followers-loading { text-align:center; color:var(--text-secondary); padding:20px 0; }
        .load-more-followers { width:100%; justify-content:center; margin-top:14px; }

        /* Social Links */
        .social-links {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0,0,0,0.05);
          flex-wrap: wrap;
        }

        .social-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          background: var(--bg-soft);
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .social-link:hover {
          background: var(--social-color);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: var(--social-color);
        }

        .social-link svg {
          font-size: 18px;
        }

        /* Content - Full Width */
        .business-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Info Sections */
        .info-section {
          background: var(--bg-elevated);
          border-radius: 20px;
          padding: 28px 32px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 20px;
          color: var(--text-primary);
        }

        .section-title svg {
          color: #667eea;
        }

        .business-description {
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 16px;
          margin: 0;
        }

        /* Contact Grid */
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .contact-item {
          display: flex;
          gap: 14px;
          padding: 16px 18px;
          background: var(--bg-soft);
          border-radius: 14px;
          transition: background 0.2s ease;
        }

        .contact-item:hover {
          background: rgba(102, 126, 234, 0.06);
        }

        .contact-icon {
          flex-shrink: 0;
          color: #667eea;
          font-size: 18px;
          margin-top: 2px;
        }

        .contact-item div {
          flex: 1;
          min-width: 0;
        }

        .contact-item label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }

        .contact-item p,
        .contact-item a {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0;
          word-break: break-word;
        }

        .contact-item a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .contact-item a:hover {
          text-decoration: underline;
        }

        /* Services Grid */
        .services-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .service-item {
          padding: 16px 20px;
          background: var(--bg-soft);
          border-radius: 14px;
          border-left: 4px solid #667eea;
        }

        .service-item h4 {
          margin: 0 0 6px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .service-item p {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Documents Grid */
        .documents-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .doc-item {
          display: flex;
          gap: 14px;
          padding: 16px 18px;
          background: var(--bg-soft);
          border-radius: 14px;
          align-items: center;
        }

        .doc-item svg {
          color: #667eea;
          font-size: 24px;
          flex-shrink: 0;
        }

        .doc-item div {
          flex: 1;
          min-width: 0;
        }

        .doc-item label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .doc-item p {
          margin: 0;
          font-size: 14px;
          color: var(--text-primary);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .contact-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
         

          .business-header {
            padding: 24px 20px;
          }

          .header-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .business-logo {
            width: 100px;
            height: 100px;
          }

          .business-meta {
            justify-content: center;
          }

          .business-actions {
            justify-content: center;
          }

          .social-links {
            justify-content: center;
          }

          .info-section {
            padding: 20px;
          }

          .contact-grid {
            grid-template-columns: 1fr;
          }

          .contact-item {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 6px;
          }

          .contact-icon {
            margin-top: 0;
          }

          .doc-item {
            flex-direction: column;
            text-align: center;
            gap: 6px;
          }

          .services-grid {
            grid-template-columns: 1fr;
          }

          .service-item {
            text-align: center;
          }

          .business-name-wrapper {
            justify-content: center;
          }

          .documents-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          

          .business-header {
            padding: 20px 16px;
          }

          .business-logo {
            width: 80px;
            height: 80px;
            font-size: 32px;
          }

          .verified-badge {
            width: 26px;
            height: 26px;
            font-size: 14px;
          }

          .btn {
            font-size: 13px;
            padding: 10px 18px;
          }

          .btn-whatsapp {
            font-size: 13px;
            padding: 10px 18px;
          }

          .info-section {
            padding: 16px;
          }

          .section-title {
            font-size: 18px;
          }

          .business-name {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}
