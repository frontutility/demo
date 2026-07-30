import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiDownload, FiEdit3, FiEye, FiEyeOff, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
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
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { buildCsv, downloadCsv } from "../utils/adminData";
import api from "../../services/api";

const blank = { title: "", slug: "", content: "", seoTitle: "", metaDescription: "", is_published: 1, sort_order: 0 };

function normalizePage(page) {
  return {
    ...page,
    title: page.title ?? "",
    slug: page.slug ?? "",
    content: page.content ?? "",
    seoTitle: page.seoTitle ?? page.seo_title ?? "",
    metaDescription: page.metaDescription ?? page.meta_description ?? "",
    is_published: Number(page.is_published ?? page.isPublished ?? 1),
    sort_order: Number(page.sort_order ?? page.sortOrder ?? 0),
    updatedAt: page.updatedAt ?? page.updated_at ?? page.createdAt ?? null,
    createdAt: page.createdAt ?? page.created_at ?? null,
  };
}

export default function AdminCmsPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [previewPage, setPreviewPage] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data: pagesData = [], loading, refetch } = useApiResource("/api/admin/cms", {
    initialData: [],
    transform: (value) => (Array.isArray(value) ? value.map(normalizePage) : []),
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | CMS";
  }, []);

  const pages = useMemo(() => Array.isArray(pagesData) ? pagesData : [], [pagesData]);
  const filteredPages = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return pages
      .slice()
      .filter((page) => [page.title, page.slug, page.content].filter(Boolean).join(" ").toLowerCase().includes(lowered))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [pages, query]);

  const csvRows = useMemo(
    () =>
      buildCsv(filteredPages, [
        { label: "Title", value: "title" },
        { label: "Slug", value: "slug" },
        { label: "Updated", value: "updatedAt" },
      ]),
    [filteredPages]
  );

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setEditorOpen(true);
  }

  function openEdit(page) {
    setEditing(page);
    setForm({
      title: page.title || "",
      slug: page.slug || "",
      content: page.content || "",
      seoTitle: page.seoTitle || "",
      metaDescription: page.metaDescription || "",
      is_published: Number(page.is_published ?? 1),
      sort_order: Number(page.sort_order ?? 0),
    });
    setEditorOpen(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function savePage(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        content: form.content,
        seo_title: form.seoTitle.trim() || null,
        meta_description: form.metaDescription.trim() || null,
        is_published: Number(form.is_published),
        sort_order: Number(form.sort_order || 0),
      };

      if (!payload.title || !payload.slug || !payload.content) {
        showToast?.({ type: "error", title: "Missing fields", message: "Title, slug, and content are required." });
        return;
      }

      if (editing?.id) {
        await api.put(`/api/admin/cms/${editing.id}`, payload);
      } else {
        await api.post("/api/admin/cms", payload);
      }

      showToast?.({ type: "success", title: "Saved", message: editing?.id ? "CMS page updated successfully." : "CMS page created successfully." });
      setEditorOpen(false);
      setEditing(null);
      setForm(blank);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || error.message || "Unable to save CMS page." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(page) {
    try {
      await api.patch(`/api/admin/cms/${page.id}/${page.is_published ? "hide" : "publish"}`);
      showToast?.({ type: "success", title: "Updated", message: page.is_published ? "CMS page hidden from public view." : "CMS page published." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Update failed", message: error?.response?.data?.message || error.message || "Unable to change page status." });
    }
  }

  async function deletePage() {
    if (!deleteTarget?.id) return;
    setSaving(true);
    try {
      await api.delete(`/api/admin/cms/${deleteTarget.id}`);
      showToast?.({ type: "success", title: "Deleted", message: "CMS page deleted successfully." });
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || error.message || "Unable to delete CMS page." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack responsive-admin-page">
      <style>{`
        .responsive-admin-page .admin-toolbar {
          gap: clamp(8px, 2vw, 16px) !important;
          flex-wrap: wrap !important;
        }
        .responsive-admin-page .admin-toolbar > div {
          flex: 1 1 clamp(200px, 100%, 400px) !important;
        }
        .responsive-admin-page .admin-table-wrap table {
          min-width: 100% !important;
          font-size: clamp(11px, 1.5vw, 14px) !important;
        }
        .responsive-admin-page .admin-table-wrap th,
        .responsive-admin-page .admin-table-wrap td {
          padding: clamp(8px, 2vw, 14px) clamp(6px, 1.5vw, 12px) !important;
        }
        .responsive-admin-page .btn {
          font-size: clamp(11px, 1.5vw, 13px) !important;
          padding: clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 14px) !important;
        }
        .responsive-admin-page .admin-cms-form {
          display: grid;
          gap: 12px;
        }
        .responsive-admin-page .admin-cms-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .responsive-admin-page .admin-cms-editor-shell {
          min-height: 260px;
        }
        @media (max-width: 768px) {
          .responsive-admin-page .admin-toolbar {
            flex-direction: column !important;
          }
          .responsive-admin-page .admin-toolbar > div {
            flex: 1 1 100% !important;
          }
          .responsive-admin-page .admin-table-wrap table {
            font-size: 12px !important;
          }
          .responsive-admin-page .admin-table-wrap th,
          .responsive-admin-page .admin-table-wrap td {
            padding: 10px 8px !important;
          }
          .responsive-admin-page .admin-cms-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .responsive-admin-page .admin-table-wrap table {
            font-size: 10px !important;
          }
          .responsive-admin-page .admin-table-wrap th,
          .responsive-admin-page .admin-table-wrap td {
            padding: 8px 6px !important;
          }
          .responsive-admin-page .btn {
            padding: 4px 6px !important;
            font-size: 9px !important;
          }
        }
        @media (max-width: 480px) {
          .responsive-admin-page .admin-table-wrap table {
            font-size: 9px !important;
          }
          .responsive-admin-page .admin-table-wrap th,
          .responsive-admin-page .admin-table-wrap td {
            padding: 6px 4px !important;
          }
        }
      `}</style>
      <PageHeader
        title="CMS Pages"
        subtitle="Create, edit, publish, and remove static pages from the admin panel."
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Add Page
          </button>
        }
      />
      <SectionCard
        title="Pages"
        action={
          <button type="button" className="btn btn-secondary" onClick={() => downloadCsv("connectnkt-cms-pages.csv", csvRows)} disabled={!filteredPages.length}>
            <FiDownload /> Export CSV
          </button>
        }
      >
        <div className="admin-toolbar" style={{ marginBottom: 14 }}>
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, slug, or content..." style={{ paddingLeft: 40 }} />
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredPages.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page) => (
                  <tr key={page.id || page.slug}>
                    <td>
                      <strong>{page.title || page.slug}</strong>
                      <div className="muted" style={{ fontSize: 13 }}>/pages/{page.slug}</div>
                    </td>
                    <td>{page.is_published ? "Published" : "Hidden"}</td>
                    <td>{page.updatedAt ? formatDate(page.updatedAt) : "N/A"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <AdminIconButton icon={<FiEye />} label="Preview page" onClick={() => setPreviewPage(page)} tone="primary" />
                        <AdminIconButton icon={<FiEdit3 />} label="Edit page" onClick={() => openEdit(page)} tone="secondary" />
                        <AdminIconButton icon={page.is_published ? <FiEyeOff /> : <FiEye />} label={page.is_published ? "Hide page" : "Publish page"} onClick={() => togglePublish(page)} tone={page.is_published ? "warning" : "success"} />
                        <AdminIconButton icon={<FiTrash2 />} label="Delete page" onClick={() => setDeleteTarget(page)} tone="danger" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No CMS pages available" message="Create your first page to manage it from the admin panel." />
        )}
      </SectionCard>

      <AdminModal
        open={editorOpen}
        title={editing?.id ? "Edit CMS Page" : "Create CMS Page"}
        subtitle="Manage the page title, content, slug, and publish state."
        size="lg"
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
          setForm(blank);
        }}
      >
        <form className="admin-cms-form" onSubmit={savePage}>
          <div className="admin-cms-grid">
            <label className="field-group">
              <span>Title</span>
              <input className="field" value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="About Us" />
            </label>
            <label className="field-group">
              <span>Slug</span>
              <input className="field" value={form.slug} onChange={(event) => updateForm("slug", event.target.value)} placeholder="about-us" />
            </label>
          </div>
          <div className="admin-cms-grid">
            <label className="field-group">
              <span>SEO Title</span>
              <input className="field" value={form.seoTitle} onChange={(event) => updateForm("seoTitle", event.target.value)} placeholder="About ConnectNKT" />
            </label>
            <label className="field-group">
              <span>Meta Description</span>
              <input className="field" value={form.metaDescription} onChange={(event) => updateForm("metaDescription", event.target.value)} placeholder="Learn more about our platform" />
            </label>
          </div>
          <div className="admin-cms-grid">
            <label className="field-group">
              <span>Status</span>
              <select className="field" value={form.is_published} onChange={(event) => updateForm("is_published", Number(event.target.value))}>
                <option value={1}>Published</option>
                <option value={0}>Hidden</option>
              </select>
            </label>
            <label className="field-group">
              <span>Sort Order</span>
              <input className="field" type="number" value={form.sort_order} onChange={(event) => updateForm("sort_order", Number(event.target.value || 0))} />
            </label>
          </div>
          <label className="field-group">
            <span>Content</span>
            <div className="admin-cms-editor-shell">
              <RichTextEditor value={form.content} onChange={(value) => updateForm("content", value)} placeholder="Write your page content here..." />
            </div>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setEditorOpen(false); setEditing(null); setForm(blank); }} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Please wait..." : editing?.id ? "Update Page" : "Create Page"}</button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(previewPage)}
        title="Page Preview"
        subtitle="Exactly how the page will appear to users"
        size="lg"
        onClose={() => setPreviewPage(null)}
      >
        {previewPage ? (
          <div className="admin-preview">
            <div className="admin-badge">{previewPage.title || previewPage.slug}</div>
            <div className="muted">Updated: {previewPage.updatedAt ? formatDate(previewPage.updatedAt) : "N/A"}</div>
            {previewPage.content ? <div className="admin-cms-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewPage.content) }} /> : <EmptyState title="No content available" message="This page preview is empty because the API did not return content." />}
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete CMS page"
        message={`Delete “${deleteTarget?.title || deleteTarget?.slug || "this page"}”? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deletePage}
        onClose={() => setDeleteTarget(null)}
        loading={saving}
      />
    </div>
  );
}
