import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiEye, FiShare2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import { useApiResource } from "../../api/useApiResource";
import { normalizeNews } from "../../admin/utils/adminData";
import { formatDate, formatCount } from "../../utils/formatters";
import { shareContent } from "../../utils/news";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

export default function NewsDetailPage() {
  const { slug } = useParams();
  const { data: news, loading } = useApiResource(slug ? `/api/news/${encodeURIComponent(slug)}` : null, {
    initialData: null,
    transform: (value) => (value ? normalizeNews(value) : null),
    deps: [slug],
  });

  useEffect(() => {
    document.title = news?.title ? `ConnectNKT | ${news.title}` : "ConnectNKT | News";
  }, [news?.title]);

  if (loading) {
    return <SkeletonCard />;
  }

  if (!news) {
    return <EmptyState title="News not found" message="The article you opened may have been removed or is still in draft." />;
  }

  return (
    <div className="stack">
      <PageHeader
        title={news.title}
        subtitle={`${news.authorName} • ${formatDate(news.publishedAt || news.createdAt)} • ${formatCount(news.viewsCount || 0)} views`}
        action={
          <Link className="btn btn-secondary" to="/news">
            <FiArrowLeft /> Back to News
          </Link>
        }
      />

      <SectionCard>
        <div className="stack" style={{ gap: 18 }}>
          {news.featuredImage ? (
            <img
              src={news.featuredImage}
              alt={news.title}
              style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 24 }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 280,
                borderRadius: 24,
                background: "linear-gradient(135deg, rgba(15,118,110,.18), rgba(37,99,235,.2))",
              }}
            />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span>{news.authorName}</span>
              <span>•</span>
              <span>{formatDate(news.publishedAt || news.createdAt)}</span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiEye /> {formatCount(news.viewsCount || 0)} views
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                shareContent({
                  title: news.title,
                  url: window.location.href,
                  text: news.excerpt || news.title,
                })
              }
            >
              <FiShare2 /> Share
            </button>
          </div>

          <article className="news-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.content || "<p>No content available.</p>") }} />
        </div>
      </SectionCard>
    </div>
  );
}
