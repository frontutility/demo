import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiEye, FiEyeOff, FiFileText, FiImage, FiPlus, FiSearch, FiShare2, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminIconButton from "../components/AdminIconButton";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import RichTextEditor from "./RichTextEditor";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { asArray, normalizeNews } from "../utils/adminData";
import { formatCount, formatDate } from "../../utils/formatters";
import { matchesSearchQuery } from "../../utils/search";
import { shareContent } from "../../utils/news";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import "./AdminNewsPage.css";

function emptyForm() {
  return {
    title: "",
    subtitle: "",
    authorName: "",
    featuredImage: "",
    bannerImage: "",
    category: "",
    shortDescription: "",
    seoTitle: "",
    seoDescription: "",
    metaKeywords: "",
    content: "",
    status: "draft",
  };
}

function statusTone(status) {
  if (status === "published") return "success";
  if (status === "hidden") return "warning";
  return "neutral";
}

function StatusChip({ status }) {
  return <span className={`admin-status-pill tone-${statusTone(status)}`.trim()}>{status}</span>;
}

export default function AdminNewsPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [previewNews, setPreviewNews] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: news = [], loading, refetch } = useApiResource("/api/admin/news", {
    initialData: [],
    transform: (value) => asArray(value).map(normalizeNews),
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | News";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filteredNews = useMemo(() => {
    const list = Array.isArray(news) ? news : [];
    return list
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) =>
        matchesSearchQuery(debouncedQuery, [item.title, item.authorName, item.content, item.excerpt, item.slug])
      )
      .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0));
  }, [debouncedQuery, news, statusFilter]);

  const stats = useMemo(
    () => [
      { label: "Total News", value: news.length, icon: FiFileText },
      { label: "Published", value: news.filter((item) => item.status === "published").length, icon: FiShare2 },
      { label: "Draft", value: news.filter((item) => item.status === "draft").length, icon: FiPlus },
      { label: "Hidden", value: news.filter((item) => item.status === "hidden").length, icon: FiEyeOff },
      { label: "Total Views", value: news.reduce((sum, item) => sum + (item.viewsCount || 0), 0), icon: FiEye },
    ],
    [news]
  );

  function openCreate() {
    setPreviewNews(null);
    setForm(emptyForm());
    setMode("create");
  }

  function openEdit(item) {
    setPreviewNews(null);
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      authorName: item.authorName || "",
      featuredImage: item.featuredImage || "",
      bannerImage: item.bannerImage || "",
      category: item.category || "",
      shortDescription: item.shortDescription || item.short_description || "",
      seoTitle: item.seoTitle || item.seo_title || "",
      seoDescription: item.seoDescription || item.seo_description || "",
      metaKeywords: item.metaKeywords || item.meta_keywords || "",
      content: item.content || "",
      status: item.status || "draft",
    });
    setMode("edit");
    setPreviewNews(item);
  }

  function openView(item) {
    setPreviewNews(item);
    setMode("view");
  }

  function closeModal() {
    setMode(null);
    setPreviewNews(null);
    setForm(emptyForm());
    setSaving(false);
  }

  async function persistNews(method, url, payload, successMessage) {
    setSaving(true);
    try {
      await api({ method, url, data: payload });
      showToast?.({ type: "success", title: "Success", message: successMessage });
      closeModal();
      refetch();
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || error.message || "Action failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      author_name: form.authorName.trim(),
      featured_image: form.featuredImage.trim(),
      banner_image: form.bannerImage.trim(),
      category: form.category.trim(),
      short_description: form.shortDescription.trim(),
      seo_title: form.seoTitle.trim(),
      seo_description: form.seoDescription.trim(),
      meta_keywords: form.metaKeywords.trim(),
      content: form.content.trim(),
      status: form.status,
    };

    if (!payload.title || !payload.author_name || !payload.content) {
      showToast?.({
        type: "error",
        title: "Missing fields",
        message: "Heading, author name, and content are required.",
      });
      return;
    }

    const isEdit = mode === "edit" && previewNews?.id;
    await persistNews(isEdit ? "put" : "post", isEdit ? `/api/admin/news/${previewNews.id}` : "/api/admin/news", payload, `News ${isEdit ? "updated" : "created"} successfully.`);
  }

  async function handleToggleStatus(item) {
    const nextAction = item.status === "published" ? "hide" : "publish";
    setActionId(`${item.id}-${nextAction}`);
    try {
      await api.patch(`/api/admin/news/${item.id}/${nextAction}`);
      showToast?.({
        type: "success",
        title: "Success",
        message: `News ${nextAction === "hide" ? "hidden" : "published"} successfully.`,
      });
      refetch();
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || error.message || "Action failed.",
      });
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setActionId(`${deleteTarget.id}-delete`);
    try {
      await api.delete(`/api/admin/news/${deleteTarget.id}`);
      showToast?.({ type: "success", title: "Deleted", message: "News deleted successfully." });
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || error.message || "Delete failed.",
      });
    } finally {
      setActionId(null);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        featuredImage: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="stack responsive-admin-page">
      <style>{`
        .responsive-admin-page .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .responsive-admin-page .news-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .responsive-admin-page .news-search {
          flex: 1 1 280px;
          min-width: 240px;
        }
        .responsive-admin-page .news-search input,
        .responsive-admin-page .news-filter select,
        .responsive-admin-page .news-input,
        .responsive-admin-page .news-form textarea {
          width: 100%;
        }
        .responsive-admin-page .news-table-wrap {
          overflow-x: auto;
        }
        .responsive-admin-page table.news-table {
          width: 100%;
          border-collapse: collapse;
        }
        .responsive-admin-page .news-table th,
        .responsive-admin-page .news-table td {
          text-align: left;
          padding: 12px 10px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
        }
        .responsive-admin-page .news-table th {
          color: var(--muted);
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .responsive-admin-page .news-thumb {
          width: 72px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
          background: rgba(var(--text-rgb, 15, 23, 42), 0.08);
        }
        .responsive-admin-page .news-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .responsive-admin-page .news-preview-image {
          width: 100%;
          max-height: 240px;
          object-fit: cover;
          border-radius: 18px;
          margin-bottom: 12px;
          background: rgba(var(--text-rgb, 15, 23, 42), 0.08);
        }
        .responsive-admin-page .news-form {
          display: grid;
          gap: 12px;
        }
        .responsive-admin-page .news-grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .responsive-admin-page .news-form label {
          display: grid;
          gap: 6px;
          font-size: 0.92rem;
        }
        .responsive-admin-page .news-editor-shell {
          min-height: 280px;
        }
        .responsive-admin-page .news-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 720px) {
          .responsive-admin-page .news-grid-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="News"
        subtitle="Create and manage local news for Neem Ka Thana and nearby villages. Users can only read and share published stories."
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Create News
          </button>
        }
      />

      <div className="admin-stat-grid">
        {stats.map((stat) => (
          <SectionCard key={stat.label}>
            <div className="section-title" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <stat.icon />
              {stat.label}
            </div>
            <div style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900 }}>{formatCount(stat.value || 0)}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Manage News"
        action={
          <div className="news-toolbar">
            <div className="news-search search-shell" style={{ padding: 10 }}>
              <FiSearch className="muted" />
              <input
                type="search"
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by heading, author, or content"
                style={{ border: "none", background: "transparent", minWidth: 220 }}
              />
            </div>
            <div className="news-filter">
              <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
        }
      >
        {loading ? (
          <SkeletonCard />
        ) : filteredNews.length ? (
          <div className="news-table-wrap">
            <table className="news-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Image</th>
                  <th>Heading</th>
                  <th>Author</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Published Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNews.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      {item.featuredImage ? <img src={item.featuredImage} alt={item.title} className="news-thumb" /> : <div className="news-thumb" />}
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {item.excerpt}
                      </div>
                    </td>
                    <td>{item.authorName}</td>
                    <td>{formatCount(item.viewsCount || 0)}</td>
                    <td>
                      <StatusChip status={item.status} />
                    </td>
                    <td>{formatDate(item.publishedAt || item.createdAt)}</td>
                    <td>
                      <div className="news-actions">
                        <AdminIconButton icon={<FiEye />} label="View" onClick={() => openView(item)} />
                        <AdminIconButton icon={<FiPlus />} label="Edit" onClick={() => openEdit(item)} />
                        <AdminIconButton
                          icon={item.status === "published" ? <FiEyeOff /> : <FiEye />}
                          label={item.status === "published" ? "Hide" : "Publish"}
                          onClick={() => handleToggleStatus(item)}
                          tone={item.status === "published" ? "warning" : "success"}
                        />
                        <AdminIconButton
                          icon={<FiTrash2 />}
                          label="Delete"
                          onClick={() => setDeleteTarget(item)}
                          tone="danger"
                        />
                        <AdminIconButton
                          icon={<FiShare2 />}
                          label="Share"
                          onClick={() =>
                            shareContent({
                              title: item.title,
                              url: `${window.location.origin}/news/${item.slug}`,
                              text: item.excerpt || item.title,
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching news found" message="Try a different heading, author, or content search." />
        )}
      </SectionCard>

      <AdminModal
        open={mode === "create" || mode === "edit"}
        title={mode === "edit" ? "Edit News" : "Create News"}
        subtitle="Publish local stories, alerts, and updates from one admin-controlled place."
        size="lg"
        onClose={closeModal}
        actions={
          <div className="news-form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="news-form" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : mode === "edit" ? "Update News" : "Create News"}
            </button>
          </div>
        }
      >
        <form id="news-form" className="news-form" onSubmit={handleSave}>
          <div className="news-grid-two">
            <label>
              Heading
              <input
                className="field news-input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter news heading"
              />
            </label>
            <label>
              Author Name
              <input
                className="field news-input"
                value={form.authorName}
                onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
                placeholder="Enter author name"
              />
            </label>
          </div>

          <div className="news-grid-two">
            <label>
              Subtitle
              <input
                className="field news-input"
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Short subtitle"
              />
            </label>
            <label>
              Category
              <input
                className="field news-input"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Local update, alert, event"
              />
            </label>
          </div>

          <div className="news-grid-two">
            <label>
              Featured Image URL or Upload
              <input
                className="field news-input"
                value={form.featuredImage}
                onChange={(event) => setForm((current) => ({ ...current, featuredImage: event.target.value }))}
                placeholder="Image URL or data URL"
              />
              <input type="file" accept="image/*" className="field" onChange={handleFileChange} />
            </label>
            <label>
              Banner Image URL
              <input
                className="field news-input"
                value={form.bannerImage}
                onChange={(event) => setForm((current) => ({ ...current, bannerImage: event.target.value }))}
                placeholder="Optional banner image"
              />
            </label>
          </div>

          <div className="news-grid-two">
            <label>
              Short Description
              <textarea
                className="field news-input"
                rows={3}
                value={form.shortDescription}
                onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))}
                placeholder="Short summary for cards"
              />
            </label>
            <label>
              Status
              <select
                className="field news-input"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>

          <div className="news-grid-two">
            <label>
              SEO Title
              <input
                className="field news-input"
                value={form.seoTitle}
                onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
                placeholder="Optional SEO title"
              />
            </label>
            <label>
              Meta Keywords
              <input
                className="field news-input"
                value={form.metaKeywords}
                onChange={(event) => setForm((current) => ({ ...current, metaKeywords: event.target.value }))}
                placeholder="keyword1, keyword2"
              />
            </label>
          </div>

          <label>
            SEO Description
            <textarea
              className="field news-input"
              rows={3}
              value={form.seoDescription}
              onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))}
              placeholder="Optional SEO description"
            />
          </label>

          {form.featuredImage ? <img src={form.featuredImage} alt="Featured preview" className="news-preview-image" /> : null}

          <label>
            Content
            <div className="news-editor-shell">
              <RichTextEditor value={form.content} onChange={(nextValue) => setForm((current) => ({ ...current, content: nextValue }))} />
            </div>
          </label>
        </form>
      </AdminModal>

      <AdminModal
        open={mode === "view"}
        title={previewNews?.title || "News Preview"}
        subtitle={previewNews ? `${previewNews.authorName} • ${formatDate(previewNews.publishedAt || previewNews.createdAt)} • ${formatCount(previewNews.viewsCount || 0)} views` : ""}
        size="lg"
        onClose={closeModal}
      >
        {previewNews ? (
          <div className="stack">
            {previewNews.featuredImage ? <img src={previewNews.featuredImage} alt={previewNews.title} className="news-preview-image" /> : null}
            <div className="muted" style={{ marginBottom: 6 }}>
              <StatusChip status={previewNews.status} />{" "}
            </div>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewNews.content || "<p>No content available.</p>") }} />
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete News"
        message={`Delete "${deleteTarget?.title || "this news item"}" permanently?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setDeleteTarget(null)}
        loading={Boolean(actionId && deleteTarget && actionId === `${deleteTarget.id}-delete`)}
      />
    </div>
  );
}
