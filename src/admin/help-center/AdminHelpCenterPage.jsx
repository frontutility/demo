import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiEdit3, FiEye, FiEyeOff, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminIconButton from "../components/AdminIconButton";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import RichTextEditor from "../news/RichTextEditor";
import { useApiResource } from "../../api/useApiResource";
import { formatDate } from "../../utils/formatters";
import { matchesSearchQuery } from "../../utils/search";
import api from "../../services/api";

const CATEGORIES = [
  "General",
  "Account",
  "Posts",
  "Comments",
  "Polls",
  "Privacy",
  "Security",
  "News",
  "Business",
  "Verification",
  "Technical",
  "Other",
];

const blank = { question: "", slug: "", category: "", answer: "", is_published: 1, sort_order: 0 };

function normalize(article) {
  return {
    ...article,
    question: article.question ?? article.title ?? "",
    answer: article.answer ?? article.content ?? "",
    is_published: Number(article.is_published ?? article.isPublished ?? article.status === "published" ?? 1),
    lastUpdated: article.lastUpdated ?? article.last_updated ?? article.updated_at,
    createdAt: article.created_at ?? article.createdAt,
    sort_order: Number(article.sort_order ?? article.sortOrder ?? 0),
    id: article.id,
    slug: article.slug,
    category: article.category,
    helpfulCount: article.helpful_count ?? article.helpfulCount ?? 0,
    notHelpfulCount: article.not_helpful_count ?? article.notHelpfulCount ?? 0,
  };
}

export default function AdminHelpCenterPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data: articles = [], loading, refetch } = useApiResource("/api/admin/help-center", {
    initialData: [],
    transform: (value) => (Array.isArray(value) ? value.map(normalize) : []),
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Help Center";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const rows = useMemo(() => {
    let list = [...articles];
    
    if (statusFilter !== "all") {
      list = list.filter(item => (statusFilter === "published" ? item.is_published === 1 : item.is_published === 0));
    }
    if (categoryFilter !== "All") {
      list = list.filter(item => item.category === categoryFilter);
    }
    list = list.filter(item => matchesSearchQuery(debouncedQuery, [item.question, item.answer, item.category, item.slug]));
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [articles, debouncedQuery, categoryFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setEditorOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      question: item.question || "",
      slug: item.slug || "",
      category: item.category || "",
      answer: item.answer || "",
      is_published: Number(item.is_published ?? 1),
      sort_order: Number(item.sort_order ?? 0),
    });
    setEditorOpen(true);
  }

  async function saveArticle(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        slug: form.slug.trim(),
        category: form.category.trim(),
        answer: form.answer,
        is_published: Number(form.is_published),
        sort_order: Number(form.sort_order || 0),
      };
      
      if (!payload.question || !payload.category || !payload.answer) {
        showToast?.({ type: "error", title: "Missing fields", message: "Question, category, and answer are required." });
        return;
      }
      
      if (editing?.id) {
        await api.put(`/api/help-center/${editing.id}`, payload);
      } else {
        await api.post("/api/help-center", payload);
      }
      showToast?.({ type: "success", title: "Saved", message: "Help article saved successfully." });
      setEditing(null);
      setForm(blank);
      setEditorOpen(false);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || error.message || "Unable to save article." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item) {
    try {
      await api.put(`/api/help-center/${item.id}`, { is_published: item.is_published ? 0 : 1 });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: "Failed to update status." });
    }
  }

  async function deleteArticle() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/api/help-center/${deleteTarget.id}`);
      showToast?.({ type: "success", title: "Deleted", message: "Help article deleted." });
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: "Failed to delete article." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack responsive-admin-page">
      <style>{`
        .responsive-admin-page .help-center-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .responsive-admin-page .help-center-search {
          flex: 1 1 280px;
          min-width: 240px;
        }
        .responsive-admin-page .help-center-table-wrap {
          overflow-x: auto;
        }
        .responsive-admin-page table.help-center-table {
          width: 100%;
          border-collapse: collapse;
        }
        .responsive-admin-page .help-center-table th,
        .responsive-admin-page .help-center-table td {
          text-align: left;
          padding: 12px 10px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
        }
        .responsive-admin-page .help-center-table th {
          color: var(--muted);
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .responsive-admin-page .help-center-form {
          display: grid;
          gap: 12px;
        }
        .responsive-admin-page .help-center-grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .responsive-admin-page .help-center-form label {
          display: grid;
          gap: 6px;
          font-size: 0.92rem;
        }
        .responsive-admin-page .help-center-editor-shell {
          min-height: 280px;
        }
        .responsive-admin-page .help-center-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 720px) {
          .responsive-admin-page .help-center-grid-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="Help Center"
        subtitle="Add, edit, hide, publish, and delete help articles. Users can only read published articles."
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Add Article
          </button>
        }
      />

      <SectionCard
        title="Help Articles"
        action={
          <div className="help-center-toolbar">
            <div className="help-center-search search-shell" style={{ padding: 10 }}>
              <FiSearch className="muted" />
              <input
                type="search"
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles"
                style={{ border: 0, background: "transparent", minWidth: 220 }}
              />
            </div>
            <select
              className="field"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              className="field"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <SkeletonCard />
        ) : rows.length ? (
          <div className="help-center-table-wrap">
            <table className="help-center-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Display Order</th>
                  <th>Created Date</th>
                  <th>Updated Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <strong>{item.question}</strong>
                      <div className="muted" style={{ fontSize: 13 }}>
                        /help-center/{item.slug}
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.is_published ? "Published" : "Hidden"}</td>
                    <td>{item.sort_order ?? 0}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.lastUpdated)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <AdminIconButton icon={<FiEdit3 />} label="Edit" onClick={() => openEdit(item)} />
                        <AdminIconButton
                          icon={item.is_published ? <FiEyeOff /> : <FiEye />}
                          label={item.is_published ? "Hide" : "Publish"}
                          onClick={() => togglePublish(item)}
                        />
                        <AdminIconButton
                          icon={<FiTrash2 />}
                          label="Delete"
                          tone="danger"
                          onClick={() => setDeleteTarget(item)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No help articles found" message="Add a new article or adjust your search/filters." />
        )}
      </SectionCard>

      <AdminModal
        open={editorOpen}
        title={editing?.id ? "Edit Article" : "Add Article"}
        subtitle="Create or edit a help center article."
        size="lg"
        onClose={() => {
          setEditing(null);
          setForm(blank);
          setEditorOpen(false);
        }}
        actions={
          <div className="help-center-form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setEditorOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="help-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Article"}
            </button>
          </div>
        }
      >
        <form id="help-form" className="help-center-form" onSubmit={saveArticle}>
          <label>
            Question *
            <input
              className="field"
              value={form.question}
              onChange={(event) => setForm((value) => ({ ...value, question: event.target.value }))}
              placeholder="Enter help article question"
            />
          </label>
          <div className="help-center-grid-two">
            <label>
              Slug
              <input
                className="field"
                value={form.slug}
                onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))}
                placeholder="Article slug (optional, auto-generated)"
              />
            </label>
            <label>
              Category *
              <select
                className="field"
                value={form.category}
                onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
          </div>
          <div className="help-center-grid-two">
            <label>
              Status
              <select
                className="field"
                value={form.is_published}
                onChange={(event) => setForm((value) => ({ ...value, is_published: Number(event.target.value) }))}
              >
                <option value={1}>Published</option>
                <option value={0}>Hidden</option>
              </select>
            </label>
            <label>
              Display Order
              <input
                className="field"
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((value) => ({ ...value, sort_order: Number(event.target.value) }))}
                placeholder="Display order"
              />
            </label>
          </div>
          <label>
            Answer *
            <div className="help-center-editor-shell">
              <RichTextEditor
                value={form.answer}
                onChange={(nextValue) => setForm((value) => ({ ...value, answer: nextValue }))}
              />
            </div>
          </label>
        </form>
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTarget?.question || "this help article"}"?`}
        confirmLabel="Delete"
        onConfirm={deleteArticle}
        onClose={() => setDeleteTarget(null)}
        loading={saving}
      />
    </div>
  );
}