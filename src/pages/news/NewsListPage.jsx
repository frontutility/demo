import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiSearch, FiShare2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import { useApiResource } from "../../api/useApiResource";
import { asArray, normalizeNews } from "../../admin/utils/adminData";
import { matchesSearchQuery } from "../../utils/search";
import { formatDate, formatCount } from "../../utils/formatters";
import { shareContent } from "../../utils/news";
import { stripHtml } from "../../utils/news";

export default function NewsListPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: news = [], loading } = useApiResource("/api/news", {
    initialData: [],
    transform: (value) => asArray(value).map(normalizeNews),
  });

  useEffect(() => {
    document.title = "ConnectNKT | News";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filteredNews = useMemo(
    () =>
      (Array.isArray(news) ? news : [])
        .filter((item) => matchesSearchQuery(debouncedQuery, [item.title, item.authorName, stripHtml(item.content)]))
        .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0)),
    [debouncedQuery, news]
  );

  return (
    <div className="stack">
      <PageHeader
        title="News"
        subtitle="Local updates from Neem Ka Thana and nearby villages. Read-only for users, with sharing enabled."
      />

      <SectionCard>
        <div className="search-shell" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <FiSearch className="muted" />
          <input
            type="search"
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by heading, author, or content"
            style={{ border: "none", background: "transparent", width: "100%" }}
          />
        </div>
      </SectionCard>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : filteredNews.length ? (
        <div className="stack">
          {filteredNews.map((item) => (
            <article
              key={item.id}
              className="card card-pad news-card"
            >
              <Link to={`/news/${item.slug}`} className="news-card-image">
                {item.featuredImage ? (
                  <img
                    src={item.featuredImage}
                    alt={item.title}
                    className="news-img"
                  />
                ) : (
                  <div className="news-img-placeholder" />
                )}
              </Link>

              <div className="news-card-content">
                <div className="news-meta">
                  <span className="news-author">{item.authorName}</span>
                  <span className="news-divider">•</span>
                  <span className="news-date">{formatDate(item.publishedAt || item.createdAt)}</span>
                  <span className="news-divider">•</span>
                  <span className="news-views">{formatCount(item.viewsCount || 0)} views</span>
                </div>

                <h2 className="news-title">
                  <Link to={`/news/${item.slug}`} className="news-title-link">
                    {item.title}
                  </Link>
                </h2>

                <p className="news-excerpt">
                  {item.excerpt}
                </p>

                <div className="news-actions">
                  <Link className="btn btn-primary btn-sm" to={`/news/${item.slug}`}>
                    Read More <FiArrowRight size={14} />
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm news-share-btn"
                    onClick={() =>
                      shareContent({
                        title: item.title,
                        url: `${window.location.origin}/news/${item.slug}`,
                        text: item.excerpt || item.title,
                      })
                    }
                  >
                    <FiShare2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching news found" message="Try a different heading, author, or keyword." />
      )}

      <style>{`
        .news-card {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 16px;
          padding: 12px 14px;
          border-radius: 12px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        
        .news-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        
        .news-card-image {
          display: block;
          border-radius: 8px;
          overflow: hidden;
          text-decoration: none;
        }
        
        .news-img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          transition: transform 0.2s ease;
        }
        
        .news-card-image:hover .news-img {
          transform: scale(1.03);
        }
        
        .news-img-placeholder {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(15,118,110,.15), rgba(37,99,235,.15));
        }
        
        .news-card-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: space-between;
        }
        
        .news-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          opacity: 0.7;
        }
        
        .news-divider {
          opacity: 0.4;
        }
        
        .news-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .news-title-link {
          color: inherit;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        
        .news-title-link:hover {
          color: #3b82f6;
        }
        
        .news-excerpt {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .news-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 2px;
        }
        
        .news-share-btn {
          padding: 6px 10px;
          border-radius: 8px;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .news-card {
            grid-template-columns: 120px 1fr;
            gap: 12px;
            padding: 10px;
          }
          
          .news-img, .news-img-placeholder {
            height: 100px;
          }
          
          .news-title {
            font-size: 15px;
          }
          
          .news-excerpt {
            font-size: 12px;
            -webkit-line-clamp: 2;
          }
        }
        
        @media (max-width: 480px) {
          .news-card {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .news-img, .news-img-placeholder {
            height: 160px;
          }
          
          .news-meta {
            font-size: 11px;
          }
          
          .news-title {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
