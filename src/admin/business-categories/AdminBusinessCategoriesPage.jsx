import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiDownload, FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import AdminIconButton from "../components/AdminIconButton";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatCount, formatDate } from "../../utils/formatters";
import { asArray, buildCsv, downloadCsv } from "../utils/adminData";

const PAGE_SIZE = 10;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminBusinessCategoriesPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingCategory, setEditingCategory] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const path = "/api/admin/business-categories";
  const { data: categoriesData = [], loading, refetch } = useApiResource(path, { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Business Categories";
  }, []);

  const categories = useMemo(() => asArray(categoriesData), [categoriesData]);

  const filteredCategories = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return categories;
    return categories.filter(category => 
      [category.name, category.slug, category.description].filter(Boolean).join(" ").toLowerCase().includes(lowered)
    );
  }, [query, categories]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const pagedCategories = filteredCategories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = filteredCategories.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  const csvRows = useMemo(
    () =>
      buildCsv(filteredCategories, [
        { label: "Name", value: "name" },
        { label: "Slug", value: "slug" },
        { label: "Type", value: "type" },
        { label: "Sort Order", value: "sort_order" },
        { label: "Is Active", value: (row) => row.is_active ? "Yes" : "No" },
      ]),
    [filteredCategories]
  );

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/api/admin/business-categories/${editingCategory.id}`, {
          name: editingCategory.name,
          slug: editingCategory.slug || slugify(editingCategory.name),
          icon: editingCategory.icon,
          icon_web: editingCategory.icon_web,
          icon_emoji: editingCategory.icon_emoji,
          type: editingCategory.type,
          image: editingCategory.image,
          description: editingCategory.description,
          sort_order: editingCategory.sort_order,
          is_active: editingCategory.is_active,
        });
        showToast?.({ type: "success", title: "Category updated", message: "Changes were saved successfully." });
        setEditingCategory(null);
      } else {
        await api.post("/api/admin/business-categories", {
          name: creatingCategory?.name,
          slug: creatingCategory?.slug || slugify(creatingCategory?.name),
          icon: creatingCategory?.icon,
          icon_web: creatingCategory?.icon_web,
          icon_emoji: creatingCategory?.icon_emoji,
          type: creatingCategory?.type,
          image: creatingCategory?.image,
          description: creatingCategory?.description,
          sort_order: creatingCategory?.sort_order,
          is_active: creatingCategory?.is_active ?? 1,
        });
        showToast?.({ type: "success", title: "Category created", message: "New category was added successfully." });
        setCreatingCategory(null);
      }
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || error.message || "Unable to save category." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    setConfirmDeleteCategory(category);
  }

  async function handleConfirmDeleteCategory() {
    if (!confirmDeleteCategory) return;
    setActionId(confirmDeleteCategory.id);
    try {
      await api.delete(`/api/admin/business-categories/${confirmDeleteCategory.id}`);
      showToast?.({ type: "success", title: "Category deleted", message: "Category was removed from the database." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || error.message || "Unable to delete category." });
    } finally {
      setActionId(null);
      setConfirmDeleteCategory(null);
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
        @media (max-width: 768px) {
          .responsive-admin-page .admin-toolbar {
            flex-direction: column !important;
          }
          .responsive-admin-page .admin-toolbar > div {
            flex: 1 1 100% !important;
          }
          .responsive-admin-page .btn {
            font-size: 12px !important;
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
      `}</style>
      <PageHeader title="Business Categories" subtitle="Manage business categories for the directory." />

      <SectionCard
        title="Category Management"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => downloadCsv("connectnkt-business-categories.csv", csvRows)} disabled={!filteredCategories.length}>
              <FiDownload /> Export CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setEditingCategory(null);
              setCreatingCategory({ name: "", slug: "", icon: "", icon_web: "", icon_emoji: "", type: "business", image: "", description: "", sort_order: 0, is_active: 1 });
            }}>
              <FiPlus /> Add Category
            </button>
          </div>
        }
      >
        <div className="admin-toolbar" style={{ marginBottom: 14 }}>
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category name, slug, or description..." style={{ paddingLeft: 40 }} />
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredCategories.length ? (
          <>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Icon</th>
                    <th>Category Name</th>
                    <th>Slug</th>
                    <th>Type</th>
                    <th>Sort Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCategories.map((category, index) => (
                    <tr key={category.id}>
                      <td>{start + index}</td>
                      <td>
                        {category.icon_emoji ? <span style={{ fontSize: 24 }}>{category.icon_emoji}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td><strong>{category.name}</strong></td>
                      <td>{category.slug || "N/A"}</td>
                      <td>{category.type || "business"}</td>
                      <td>{category.sort_order}</td>
                      <td>
                        <span className={`status ${category.is_active ? 'success' : 'danger'}`}>
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <AdminIconButton icon={<FiEdit2 />} label="Edit category" onClick={() => setEditingCategory({ ...category })} tone="primary" />
                          <AdminIconButton icon={<FiTrash2 />} label="Delete category" onClick={() => handleDelete(category)} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination" style={{ marginTop: 16 }}>
              <div className="muted">
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, filteredCategories.length)} of {filteredCategories.length}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </button>
                <span className="admin-badge">{page} / {pageCount}</span>
                <button className="btn btn-secondary" type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No categories found" message="Try a different search term or add a new category." />
        )}
      </SectionCard>

      <AdminModal
        open={Boolean(editingCategory) || Boolean(creatingCategory)}
        title={editingCategory ? "Edit Category" : "Add Category"}
        subtitle="Update category details"
        onClose={() => {
          if (saving) return;
          setEditingCategory(null);
          setCreatingCategory(null);
        }}
        actions={<><button className="btn btn-secondary" type="button" onClick={() => { setEditingCategory(null); setCreatingCategory(null); }} disabled={saving}>Cancel</button><button className="btn btn-primary" type="submit" form="admin-category-form" disabled={saving}>{saving ? "Saving..." : "Save"}</button></>}
      >
        <form id="admin-category-form" className="admin-form-grid" onSubmit={saveCategory}>
          <input
            className="admin-field"
            value={editingCategory?.name ?? creatingCategory?.name ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, name: value, slug: current.slug || slugify(value) }));
              else setCreatingCategory((current) => ({ ...(current || {}), name: value, slug: (current?.slug || slugify(value)) }));
            }}
            placeholder="Category Name"
          />
          <input
            className="admin-field"
            value={editingCategory?.slug ?? creatingCategory?.slug ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, slug: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), slug: value }));
            }}
            placeholder="Slug"
          />
          <select
            className="admin-field"
            value={editingCategory?.type ?? creatingCategory?.type ?? "business"}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, type: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), type: value }));
            }}
          >
            <option value="business">Business</option>
            <option value="person">Person</option>
            <option value="both">Both</option>
          </select>
          <input
            className="admin-field"
            value={editingCategory?.icon_emoji ?? creatingCategory?.icon_emoji ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, icon_emoji: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), icon_emoji: value }));
            }}
            placeholder="Icon Emoji (e.g. 🏥)"
          />
          <input
            className="admin-field"
            value={editingCategory?.icon ?? creatingCategory?.icon ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, icon: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), icon: value }));
            }}
            placeholder="Icon URL"
          />
          <input
            className="admin-field"
            value={editingCategory?.icon_web ?? creatingCategory?.icon_web ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, icon_web: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), icon_web: value }));
            }}
            placeholder="Icon Web (HTML/Class)"
          />
          <input
            className="admin-field"
            value={editingCategory?.image ?? creatingCategory?.image ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, image: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), image: value }));
            }}
            placeholder="Image URL"
          />
          <input
            className="admin-field"
            type="number"
            value={editingCategory?.sort_order ?? creatingCategory?.sort_order ?? 0}
            onChange={(event) => {
              const value = parseInt(event.target.value) || 0;
              if (editingCategory) setEditingCategory((current) => ({ ...current, sort_order: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), sort_order: value }));
            }}
            placeholder="Sort Order"
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={editingCategory?.is_active ?? creatingCategory?.is_active ?? true}
              onChange={(event) => {
                const value = event.target.checked ? 1 : 0;
                if (editingCategory) setEditingCategory((current) => ({ ...current, is_active: value }));
                else setCreatingCategory((current) => ({ ...(current || {}), is_active: value }));
              }}
            />
            Active
          </label>
          <textarea
            className="admin-field"
            value={editingCategory?.description ?? creatingCategory?.description ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingCategory) setEditingCategory((current) => ({ ...current, description: value }));
              else setCreatingCategory((current) => ({ ...(current || {}), description: value }));
            }}
            placeholder="Description"
            rows={3}
          />
        </form>
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(confirmDeleteCategory)}
        title={confirmDeleteCategory ? `Delete category ${confirmDeleteCategory.name}?` : "Delete category?"}
        message="This action cannot be undone."
        confirmLabel="Delete category"
        cancelLabel="Cancel"
        loading={actionId === confirmDeleteCategory?.id}
        onConfirm={handleConfirmDeleteCategory}
        onClose={() => setConfirmDeleteCategory(null)}
      />
    </div>
  );
}
