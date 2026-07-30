import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import { formatDate } from "../../utils/formatters";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import api from "../../services/api";
import { useOptionalAuth } from "../../context/AuthContext";

function copyToClipboard(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function HelpCenterArticlePage() {
  const { slug } = useParams();
  const articlePath = slug ? `/api/help-center/${encodeURIComponent(slug)}` : null;
  const { data: article = null, loading } = useApiResource(articlePath, {
    initialData: null,
    transform: (payload) => payload || null,
    deps: [slug],
  });
  const { data: relatedArticles = [] } = useApiResource(article?.category ? `/api/help-center?q=${encodeURIComponent(article.category)}` : null, {
    initialData: [],
    deps: [article?.category],
  });
  const [copied, setCopied] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [voteCounts, setVoteCounts] = useState(null);
  const auth = useOptionalAuth();

  useEffect(() => {
    if (article?.question) {
      document.title = `ConnectNKT | ${article.question}`;
    }
  }, [article?.question]);

  const relatedFaqs = useMemo(() => {
    if (!article || !article.category) return [];
    return relatedArticles.filter((item) => item.slug !== article.slug && item.category === article.category).slice(0, 4);
  }, [article, relatedArticles]);

  async function submitVote(voteType) {
    if (!auth?.user?.loggedIn || voting) {
      setVoteError("Please sign in to vote.");
      return;
    }
    setVoting(true);
    setVoteError("");
    try {
      const response = await api.post(`/api/help-center/${article.id}/vote`, { vote_type: voteType });
      setVoteCounts(response?.data?.data ?? response?.data ?? null);
    } catch (error) {
      setVoteError(error?.response?.data?.message || error.message || "Unable to save your vote.");
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <SkeletonCard />;
  }

  if (!article) {
    return (
      <div className="stack">
        <EmptyState
          title="FAQ not found"
          message="This article appears to be missing or the link may be incorrect."
          action={
            <Link to="/help-center" className="btn btn-primary">
              Back to Help Center
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <style>{`
        .help-vote-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .faq-card.related-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: linear-gradient(135deg, color-mix(in srgb, var(--bg-solid) 90%, transparent), color-mix(in srgb, var(--brand) 7%, var(--bg-solid)));
          color: var(--text);
          transition: all 0.2s ease;
        }
        .faq-card.related-card:hover {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }
      `}</style>
      <PageHeader
        title={article.question}
        subtitle={`Category: ${article.category} • Updated ${formatDate(article.lastUpdated)}`}
        action={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              copyToClipboard(window.location.href);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? "Copied" : "Share article"}
          </button>
        }
      />

      <SectionCard className="max-w-4xl mx-auto">
        <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.answer) }} />
      </SectionCard>

      <SectionCard title="Helpful votes">
        <div className="help-vote-row">
          <button type="button" className="btn btn-primary" disabled={voting} onClick={() => submitVote("helpful")}>
            Helpful ({voteCounts?.helpfulCount ?? (article.helpfulCount || 0)})
          </button>
          <button type="button" className="btn btn-secondary" disabled={voting} onClick={() => submitVote("not_helpful")}>
            Not helpful ({voteCounts?.notHelpfulCount ?? (article.notHelpfulCount || 0)})
          </button>
        </div>
        {voteError ? <div className="error-text" role="alert">{voteError}</div> : null}
      </SectionCard>

      <SectionCard title="Related articles">
        <div className="stack">
          {relatedFaqs.length > 0 ? (
            relatedFaqs.map((item) => (
              <Link key={item.id} to={`/help-center/${item.slug}`} className="faq-card related-card">
                <div>
                  <div className="badge badge-sm">{item.category}</div>
                  <h3>{item.question}</h3>
                </div>
                <div className="muted">{item.helpfulCount || 0} people found this helpful</div>
              </Link>
            ))
          ) : (
            <EmptyState title="No related articles" message="No related articles are available for this category." />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
