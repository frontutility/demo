import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import { normalizeSearchText, matchesSearchQuery } from "../../utils/search";
import { escapeAndHighlight, sanitizeHtml } from "../../utils/sanitizeHtml";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

function highlightText(text, query) {
  if (!query.trim()) return text;
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  if (!terms.length) return text;
  let highlighted = text;
  terms.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    highlighted = highlighted.replace(regex, "<mark>$1</mark>");
  });
  return highlighted;
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTopic, setActiveTopic] = useState("");
  const [openFaqId, setOpenFaqId] = useState(null);

  useEffect(() => {
    document.title = "ConnectNKT | Help Center";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchTerm = activeTopic || debouncedQuery.trim();
  const endpoint = searchTerm ? `/api/help-center?q=${encodeURIComponent(searchTerm)}` : "/api/help-center";
  const { data: faqs = [], loading } = useApiResource(endpoint, { initialData: [] });

  const categories = useMemo(() => {
    const counts = {};
    faqs.forEach((faq) => {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    });
    return ["All", ...Object.keys(counts).sort()].map((category) => ({
      category,
      count: category === "All" ? faqs.length : counts[category] || 0,
    }));
  }, [faqs]);

  const popularTopics = useMemo(() => {
    return [...new Set(faqs.map((faq) => faq.category).filter(Boolean))].slice(0, 8);
  }, [faqs]);

  const popularSearches = useMemo(() => {
    return [...new Set(faqs.flatMap((faq) => faq.keywords || []).filter(Boolean))].slice(0, 6);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs
      .filter((faq) => selectedCategory === "All" || faq.category === selectedCategory)
      .filter((faq) => {
        if (!debouncedQuery && !activeTopic) return true;
        return matchesSearchQuery(activeTopic || debouncedQuery, [faq.question, faq.answer, faq.tags?.join(" "), faq.keywords?.join(" ")]);
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (b.helpfulCount || 0) - (a.helpfulCount || 0));
  }, [activeTopic, debouncedQuery, faqs, selectedCategory]);

  const activeTitle = activeTopic ? `Topic: ${activeTopic}` : debouncedQuery ? `Search results for "${debouncedQuery}"` : "Help Center FAQs";

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="stack">
      <style>{`
        .help-hero {
          background: linear-gradient(135deg, var(--accent-bg) 0%, var(--bg-solid) 100%);
        }
        .help-topic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .topic-card {
          padding: 14px 16px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--bg-solid) 88%, transparent);
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          text-align: center;
          color: var(--text);
        }
        .topic-card:hover {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, var(--bg-solid)), color-mix(in srgb, var(--brand-2) 10%, var(--bg-solid)));
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }
        .topic-card.active {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, var(--bg-solid)), color-mix(in srgb, var(--brand-2) 16%, var(--bg-solid)));
          color: var(--brand);
        }
        .faq-accordion-item {
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-solid);
          transition: all 0.2s ease;
        }
        .faq-accordion-item:hover {
          border-color: var(--accent-color);
        }
        .faq-accordion-header {
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          cursor: pointer;
          gap: 16px;
        }
        .faq-accordion-header:hover {
          background: var(--accent-bg);
        }
        .faq-accordion-content {
          padding: 0 18px 18px;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .faq-accordion-content .prose {
          color: var(--text);
        }
        .help-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        .category-pill {
          padding: 12px 16px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--bg-solid) 88%, transparent);
          border: 1px solid var(--line);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
          color: var(--text);
          font-weight: 600;
        }
        .category-pill:hover {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, var(--bg-solid)), color-mix(in srgb, var(--brand-2) 10%, var(--bg-solid)));
        }
        .category-pill.active {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, var(--bg-solid)), color-mix(in srgb, var(--brand-2) 16%, var(--bg-solid)));
          color: var(--brand);
        }
        .help-pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .search-chip {
          padding: 8px 14px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--bg-solid) 88%, transparent);
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text);
          font-weight: 500;
        }
        .search-chip:hover {
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, var(--bg-solid)), color-mix(in srgb, var(--brand-2) 10%, var(--bg-solid)));
        }
        .help-main-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .help-main-grid {
            grid-template-columns: 1fr;
          }
          .help-aside {
            order: -1;
          }
        }
      `}</style>

      <section className="help-hero card card-pad">
        <div className="help-hero-copy">
          <div className="eyebrow">Help Center</div>
          <h1>How can we help you today?</h1>
          <p className="muted">Search guides, FAQs, account help, posting rules and platform information.</p>
        </div>
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setActiveTopic("");
          }}
          placeholder="Search help articles, keywords, questions..."
        />
      </section>

      <SectionCard title="Popular Topics">
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="help-topic-grid">
            {popularTopics.length ? (
              popularTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={`topic-card ${activeTopic === topic ? "active" : ""}`}
                  onClick={() => {
                    setActiveTopic(topic);
                    setQuery("");
                    setDebouncedQuery("");
                    setSelectedCategory("All");
                    setOpenFaqId(null);
                  }}
                >
                  {topic}
                </button>
              ))
            ) : (
              <EmptyState title="No topics available" message="Topics will appear once FAQs exist in the database." />
            )}
          </div>
        )}
      </SectionCard>

      <div className="help-main-grid">
        <div className="help-main-col">
          <SectionCard title={activeTitle} action={null}>
            {loading ? (
              <SkeletonCard />
            ) : filteredFaqs.length > 0 ? (
              <div className="stack" style={{ gap: 12 }}>
                {filteredFaqs.map((faq) => (
                  <div key={faq.id} className="faq-accordion-item">
                    <button
                      type="button"
                      className="faq-accordion-header"
                      onClick={() => toggleFaq(faq.id)}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="badge badge-sm" style={{ marginBottom: 6 }}>{faq.category}</div>
                        <h3 className="faq-question" style={{ margin: 0, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: escapeAndHighlight(faq.question, activeTopic || debouncedQuery) }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
                        <div className="faq-counts" style={{ fontSize: 13, gap: 12 }}>
                          <span>{faq.helpfulCount || 0} helpful</span>
                        </div>
                        {openFaqId === faq.id ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                      </div>
                    </button>
                    {openFaqId === faq.id && (
                      <div className="faq-accordion-content">
                        <div
                          className="prose"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(highlightText(faq.answer, activeTopic || debouncedQuery)),
                          }}
                        />
                        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
                          <Link to={`/help-center/${faq.slug}`} className="btn btn-secondary btn-sm">View full article</Link>
                          {(faq.tags || []).length > 0 && (
                            <div className="tag-row">
                              {(faq.tags || []).slice(0, 4).map((tag) => (
                                <span key={tag} className="tag-pill">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No matching articles" message="Try changing your search, removing filters, or selecting a different topic." />
            )}
          </SectionCard>

          <SectionCard title="FAQ Categories">
            <div className="help-category-grid">
              {categories.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  className={`category-pill ${selectedCategory === item.category ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategory(item.category);
                    setActiveTopic("");
                    setOpenFaqId(null);
                  }}
                >
                  <span>{item.category}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="help-aside">
          <SectionCard title="Recent searches">
            <p className="muted">Recent searches are shown after you search for a topic.</p>
          </SectionCard>

          <SectionCard title="Popular searches">
            <div className="help-pill-grid">
              {popularSearches.length ? (
                popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="search-chip"
                    onClick={() => {
                      setActiveTopic("");
                      setQuery(term);
                      setDebouncedQuery(term);
                      setOpenFaqId(null);
                    }}
                  >
                    {term}
                  </button>
                ))
              ) : (
                <EmptyState title="No popular searches" message="Popular search terms will appear once FAQs exist." />
              )}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
