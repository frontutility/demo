import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiStar } from "react-icons/fi";
import { useApiResource } from "../../api/useApiResource";
import { resolveMediaUrl } from "../../utils/profile";



export default function BusinessDirectoryPage() {
  const navigate = useNavigate();
  const { data: categories = [] } = useApiResource("/api/business/categories", { initialData: [] });
  const { data: businesses = [] } = useApiResource("/api/business/list", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT | Business Directory";
  }, []);

  const handleCategoryClick = (categoryId) => {
    navigate(`/business/category/${categoryId}`);
  };

  return (
    <div className="business-directory-page">
      {/* Modern Hero Section with Gradient */}
      <div className="directory-hero">
        <div className="hero-content">
          <div className="eyebrow">
            <FiStar className="eyebrow-icon" /> Discover local services
          </div>
          <h1>Business Directory</h1>
          <p>Browse businesses by category.</p>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="category-cards-section">
        <h2 className="section-title">Browse by Category</h2>
        <div className="category-cards-grid">
          {categories.map((category) => {
            // Get icon from database - use icon_emoji if available, otherwise use icon or icon_url
            let iconDisplay;
            const iconUrl = category.icon_url || category.iconUrl;
            const iconEmoji = category.icon_emoji || category.icon;

            if (iconUrl && iconUrl.trim() !== "") {
              // Display image icon from database
              iconDisplay = <img src={resolveMediaUrl(iconUrl)} alt={category.name} className="category-icon-img" />;
            } else if (iconEmoji) {
              // Display emoji icon
              iconDisplay = <span className="category-emoji">{iconEmoji}</span>;
            } else {
              // Fallback icon
              iconDisplay = <span className="category-emoji">🏷️</span>;
            }
            
            return (
              <button
                key={category.id}
                className="category-card"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="category-card-icon">
                  {iconDisplay}
                </div>
                <div className="category-card-content">
                  <h4>{category.name}</h4>
                  <span className="category-count">
                    {businesses.filter(b => String(b.category_id) === String(category.id)).length} businesses
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Global Styles */
        .business-directory-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Hero Section */
        .directory-hero {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          border-radius: 24px;
          padding: 40px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 24px;
          box-shadow: var(--shadow);
        }

        .hero-content {
          color: white;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .eyebrow-icon {
          font-size: 16px;
        }

        .hero-content h1 {
          font-size: 36px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }

        .hero-content p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }

        /* Category Cards Section */
        .category-cards-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px 0;
        }

        .category-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }

        .category-card {
          background: var(--bg-solid);
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          text-align: left;
          width: 100%;
        }

        .category-card:hover {
          transform: translateY(-2px);
          border-color: var(--brand-2);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.12);
        }

        .category-card.active {
          border-color: var(--brand-2);
          background: linear-gradient(135deg, var(--surface-subtle) 0%, var(--surface-subtle) 100%);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.15);
        }

        .category-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .category-emoji {
          font-size: 20px;
        }
        .category-icon-img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 8px;
        }

        .category-card-content {
          flex: 1;
          min-width: 0;
        }

        .category-card-content h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category-count {
          font-size: 12px;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }

        .category-check {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--brand-2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .directory-hero {
            padding: 32px 36px;
          }

          .category-cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .directory-hero {
            padding: 24px 20px;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .hero-content h1 {
            font-size: 28px;
          }

          .category-cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .directory-hero {
            padding: 18px 16px;
          }

          .hero-content h1 {
            font-size: 24px;
          }

          .hero-content p {
            font-size: 14px;
          }

          .category-cards-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}