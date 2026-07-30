import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiBriefcase, FiMapPin, FiSearch, FiShare2, FiMessageCircle, FiGlobe, FiInstagram, FiFacebook, FiYoutube, FiPhoneCall, FiStar, FiArrowLeft } from "react-icons/fi";
import { HiBadgeCheck } from "react-icons/hi";
import { useApiResource } from "../../api/useApiResource";
import { resolveMediaUrl } from "../../utils/profile";

function formatTime(value) {
  if (!value) return "Not set";
  return String(value).slice(0, 5);
}

function getBusinessImage(business = {}) {
  const candidates = [
    business.logo,
    business.logo_url,
    business.logoUrl,
    business.image,
    business.image_url,
    business.imageUrl,
    business.business_image,
    business.photo,
    business.media,
  ];

  for (const v of candidates) {
    if (v) return resolveMediaUrl(v);
  }

  return "";
}

export default function BusinessCategoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [socialModal, setSocialModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: categories = [] } = useApiResource("/api/business/categories", { initialData: [] });
  const { data: villages = [] } = useApiResource("/api/villages", { initialData: [] });
  const { data: businesses = [] } = useApiResource("/api/business/list", { initialData: [] });

  const selectedCategory = useMemo(() => categories.find(cat => String(cat.id) === String(id)), [categories, id]);

  useEffect(() => {
    document.title = `${selectedCategory?.name || 'Business'} - ConnectNKT`;
  }, [selectedCategory]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedVillage]);

  const filteredBusinesses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const hasFilters = keyword || selectedVillage;
    return (Array.isArray(businesses) ? businesses : []).filter((business) => {
      const matchesCategory = hasFilters ? true : String(business.category_id) === String(id);
      const matchesSearch = !keyword || [business.business_name, business.category_name, business.village_name, business.address].filter(Boolean).join(" ").toLowerCase().includes(keyword);
      const matchesVillage = !selectedVillage || String(business.village_id) === String(selectedVillage);
      return matchesCategory && matchesSearch && matchesVillage;
    });
  }, [businesses, search, selectedVillage, id]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const paginatedBusinesses = filteredBusinesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="business-category-page">
      {/* Modern Hero Section with Gradient */}
      <div className="category-hero">
        <div className="hero-content">
          <button
            className="back-btn"
            onClick={() => navigate("/Business-Directory")}
          >
            <FiArrowLeft /> Back to Directory
          </button>
          <div className="eyebrow">
            <FiStar className="eyebrow-icon" /> {selectedCategory?.name || 'Business Category'}
          </div>
          <h1>{selectedCategory?.name || 'Businesses'}</h1>
          <p>Explore {filteredBusinesses.length} {selectedCategory?.name || 'businesses'} in the community.</p>
        </div>
      </div>

      {/* Search and Village Filter - Single Row */}
      <div className="directory-search-row">
        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses..."
          />
        </div>
        <div className="village-filter-wrapper">
          <FiMapPin className="village-filter-icon" />
          <select
            value={selectedVillage}
            onChange={(e) => {
              setSelectedVillage(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Villages</option>
            {villages.map((village) => (
              <option key={village.id} value={village.id}>{village.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Header */}
      {(search || selectedVillage) && (
        <div className="results-header">
          <div className="results-count">
            <span className="count-number">{filteredBusinesses.length}</span>
            <span className="count-label">businesses found</span>
          </div>
          <button
            className="clear-filter-btn"
            onClick={() => {
              setSelectedVillage("");
              setSearch("");
              setCurrentPage(1);
            }}
          >
            Clear all filters ×
          </button>
        </div>
      )}

      {/* Modern Card Grid */}
      {paginatedBusinesses.length ? (
        <div className="directory-grid">
          {paginatedBusinesses.map((business) => {
            const image = getBusinessImage(business);
            const socialLinks = [
              business.facebook ? { label: "Facebook", href: business.facebook, icon: <FiFacebook /> } : null,
              business.instagram ? { label: "Instagram", href: business.instagram, icon: <FiInstagram /> } : null,
              business.youtube ? { label: "YouTube", href: business.youtube, icon: <FiYoutube /> } : null,
              business.website ? { label: "Website", href: business.website, icon: <FiGlobe /> } : null,
            ].filter(Boolean);

            return (
              <article className="business-card" key={business.id}>
                {/* Left: Image */}
                <div className="business-card-left">
                  <div className="business-image-wrapper">
                    {image ? (
                      <img src={image} alt={business.business_name} className="business-image" />
                    ) : (
                      <div className="business-image-placeholder">
                        <FiBriefcase />
                      </div>
                    )}
                  </div>
                </div>

                <div className="business-card-right">
                  <div className="business-card-header">
                    <div className="business-name-row">
                      <h3>{business.business_name}</h3>
                      {business.is_verified && (
                        <span className="verified-tag" title="Verified Business">
                          <HiBadgeCheck className="username-badge-icon" color="#2563eb" size={18} title="Verified" />
                        </span>
                      )}
                    </div>
                  </div>

                  {business.tagline && (
                    <div className="business-tagline">{business.tagline}</div>
                  )}

                  <div className="business-badges">
                    {business.category_name && (
                      <span className="badge category-badge">{business.category_name}</span>
                    )}
                    {business.village_name && (
                      <span className="badge village-badge"><FiMapPin /> {business.village_name}</span>
                    )}
                  </div>

                  <div className="business-details">
                    <div className="detail-item">
                      <FiMapPin className="detail-icon" />
                      <span>{business.address || "Address not provided"}</span>
                    </div>
                    <div className="detail-item">
                      <FiPhoneCall className="detail-icon" />
                      <span>{business.phone || "Phone not available"}</span>
                    </div>
                    <div className="detail-item">
                      <FiStar className="detail-icon" />
                      <span>{formatTime(business.opening_time)} - {formatTime(business.closing_time)}</span>
                    </div>
                  </div>

                  <div className="business-card-actions">
                    {business.phone && (
                      <a
                        className="action-btn whatsapp-btn"
                        href={`https://wa.me/${business.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FiMessageCircle /> WhatsApp
                      </a>
                    )}
                    {socialLinks.length > 0 && (
                      <button
                        type="button"
                        className="action-btn social-btn"
                        onClick={() => setSocialModal(business)}
                      >
                        <FiShare2 /> Social
                      </button>
                    )}
                    <Link
                      className="action-btn primary-btn"
                      to={`/business/${business.id}`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <FiSearch className="empty-icon" />
          <h3>No businesses found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Social Modal */}
      {socialModal && (
        <div className="modal-backdrop" onClick={() => setSocialModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect with {socialModal.business_name}</h3>
              <button className="modal-close" onClick={() => setSocialModal(null)}>×</button>
            </div>
            <div className="social-links">
              {[
                socialModal.facebook ? { label: "Facebook", href: socialModal.facebook, icon: <FiFacebook /> } : null,
                socialModal.instagram ? { label: "Instagram", href: socialModal.instagram, icon: <FiInstagram /> } : null,
                socialModal.youtube ? { label: "YouTube", href: socialModal.youtube, icon: <FiYoutube /> } : null,
                socialModal.website ? { label: "Website", href: socialModal.website, icon: <FiGlobe /> } : null,
              ].filter(Boolean).map((link, idx) => (
                <a key={idx} href={link.href} target="_blank" rel="noreferrer" className="social-link-item">
                  {link.icon} {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Global Styles */
        .business-category-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Hero Section */
        .category-hero {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          border-radius: 24px;
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
          box-shadow: var(--shadow);
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          width: fit-content;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .hero-content {
          color: white;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .eyebrow-icon {
          font-size: 14px;
        }

        .hero-content h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }

        .hero-content p {
          font-size: 15px;
          opacity: 0.9;
          margin: 0;
        }

        /* Search and Village Row */
        .directory-search-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-wrapper {
          flex: 2;
          min-width: 250px;
          background: var(--bg-solid);
          border-radius: 16px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--line);
          transition: all 0.2s;
        }

        .search-wrapper:focus-within {
          border-color: var(--brand-2);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-icon {
          color: var(--brand-2);
          font-size: 20px;
          flex-shrink: 0;
        }

        .search-wrapper input {
          border: none;
          outline: none;
          width: 100%;
          height: 47px;
          font-size: 15px;
          color: var(--text);
          background: transparent;
        }

        .search-wrapper input::placeholder {
          color: var(--text-secondary);
        }

        .village-filter-wrapper {
          flex: 1;
          min-width: 200px;
          background: var(--bg-solid);
          border-radius: 16px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--line);
          transition: all 0.2s;
        }

        .village-filter-wrapper:focus-within {
          border-color: var(--brand-2);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .village-filter-icon {
          color: var(--brand-2);
          font-size: 20px;
          flex-shrink: 0;
        }

        .village-filter-wrapper select {
          border: none;
          outline: none;
          width: 100%;
          height: 47px;
          font-size: 15px;
          color: var(--text);
          background: transparent;
          cursor: pointer;
        }

        /* Results Header */
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .results-count {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }

        .count-number {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }

        .count-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .clear-filter-btn {
          padding: 6px 16px;
          background: var(--surface-subtle);
          border: none;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-filter-btn:hover {
          background: color-mix(in srgb, var(--surface-subtle) 70%, transparent);
          color: var(--text);
        }

        /* Card Grid */
        .directory-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Business Card - Horizontal Layout */
        .business-card {
          background: var(--bg-solid);
          border-radius: 20px;
          padding: 24px 28px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--line);
          display: flex;
          gap: 24px;
          align-items: stretch;
        }

        .business-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .business-card-left {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .business-image-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--surface-subtle) 0%, color-mix(in srgb, var(--surface-subtle) 70%, transparent) 100%);
          border: 2px solid var(--line);
        }

        .business-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .business-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44px;
          color: var(--text-secondary);
        }

        .business-card-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .business-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .business-name-row {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .business-name-row h3 {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          color: var(--text);
          letter-spacing: -0.3px;
        }

        .verified-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
        }

        .business-tagline {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .business-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
        }

        .category-badge {
          background: rgba(37, 99, 235, 0.15);
          color: var(--brand-2);
        }

        .village-badge {
          background: rgba(156, 39, 176, 0.15);
          color: #9c27b0;
        }

        .business-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 24px;
          padding: 8px 0 4px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .detail-icon {
          font-size: 14px;
          color: var(--brand-2);
          flex-shrink: 0;
        }

        .business-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 4px;
        }

        .action-btn {
          padding: 8px 20px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          white-space: nowrap;
        }

        .action-btn:hover {
          transform: translateY(-2px);
        }

        .whatsapp-btn {
          background: #25D366;
          color: white;
          box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);
        }

        .whatsapp-btn:hover {
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
          background: #1da851;
        }

        .social-btn {
          background: var(--surface-subtle);
          color: var(--text-secondary);
          border: 1px solid var(--line);
        }

        .social-btn:hover {
          background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
          border-color: var(--brand-2);
        }

        .primary-btn {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .primary-btn:hover {
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
          transform: translateY(-2px);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: var(--bg-solid);
          border-radius: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--line);
        }

        .empty-icon {
          font-size: 48px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: var(--text);
        }

        .empty-state p {
          margin: 0;
          color: var(--text-secondary);
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          padding: 16px 0;
        }

        .pagination-btn {
          padding: 8px 20px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: var(--surface-subtle);
          border-color: var(--brand-2);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-pages {
          display: flex;
          gap: 4px;
        }

        .pagination-page {
          width: 36px;
          height: 36px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-page:hover {
          background: var(--surface-subtle);
          border-color: var(--brand-2);
        }

        .pagination-page.active {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          border-color: var(--brand-2);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: var(--bg-solid);
          border-radius: 24px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          animation: slideUp 0.3s ease;
          box-shadow: var(--shadow);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: color 0.2s;
          padding: 0 4px;
        }

        .modal-close:hover {
          color: var(--text);
        }

        .social-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .social-link-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--surface-subtle);
          color: var(--text);
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid var(--line);
        }

        .social-link-item:hover {
          background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
          transform: translateX(4px);
          border-color: var(--brand-2);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .category-hero {
            padding: 28px 32px;
          }
        }

        @media (max-width: 768px) {
          .category-hero {
            padding: 24px 20px;
          }

          .hero-content h1 {
            font-size: 26px;
          }

          .directory-search-row {
            flex-direction: column;
          }

          .search-wrapper,
          .village-filter-wrapper {
            flex: none;
            width: 100%;
          }

          .business-card {
            flex-direction: column;
            padding: 18px 20px;
            gap: 16px;
          }

          .business-card-left {
            align-self: center;
          }

          .business-image-wrapper {
            width: 100px;
            height: 100px;
          }

          .business-image-placeholder {
            font-size: 36px;
          }

          .business-card-header {
            flex-wrap: wrap;
          }

          .business-name-row h3 {
            font-size: 18px;
          }

          .business-details {
            flex-direction: column;
            gap: 6px;
          }

          .business-card-actions {
            flex-wrap: wrap;
            justify-content: center;
          }

          .action-btn {
            flex: 1;
            justify-content: center;
            min-width: 100px;
            padding: 8px 16px;
            font-size: 12px;
          }

          .pagination {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .category-hero {
            padding: 18px 16px;
          }

          .hero-content h1 {
            font-size: 22px;
          }

          .business-card {
            padding: 14px 16px;
          }

          .business-image-wrapper {
            width: 80px;
            height: 80px;
          }

          .business-image-placeholder {
            font-size: 28px;
          }

          .business-name-row h3 {
            font-size: 16px;
          }

          .badge {
            font-size: 11px;
            padding: 2px 10px;
          }

          .detail-item {
            font-size: 12px;
          }

          .action-btn {
            font-size: 11px;
            padding: 6px 14px;
            min-width: 80px;
          }

          .modal-content {
            padding: 24px 20px;
            margin: 16px;
          }

          .pagination-page {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .pagination-btn {
            padding: 6px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
