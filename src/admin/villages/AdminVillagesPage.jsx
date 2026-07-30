import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiDownload, FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";import AdminConfirmationModal from "../components/AdminConfirmationModal";import AdminIconButton from "../components/AdminIconButton";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatCount, formatDate } from "../../utils/formatters";
import { asArray, buildCsv, downloadCsv, normalizeVillage } from "../utils/adminData";

const PAGE_SIZE = 10;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminVillagesPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingVillage, setEditingVillage] = useState(null);
  const [creatingVillage, setCreatingVillage] = useState(null);
  const [confirmDeleteVillage, setConfirmDeleteVillage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const path = query.trim() ? `/api/admin/villages?q=${encodeURIComponent(query.trim())}` : "/api/admin/villages";
  const { data: villagesData = [], loading, refetch } = useApiResource(path, { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Villages";
  }, []);

  const villages = useMemo(() => asArray(villagesData).map(normalizeVillage), [villagesData]);

  const filteredVillages = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return villages.slice().filter((village) => [village.name, village.slug].filter(Boolean).join(" ").toLowerCase().includes(lowered));
  }, [query, villages]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredVillages.length / PAGE_SIZE));
  const pagedVillages = filteredVillages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = filteredVillages.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  const csvRows = useMemo(
    () =>
      buildCsv(filteredVillages, [
        { label: "Name", value: "name" },
        { label: "Slug", value: "slug" },
        { label: "Users", value: "users" },
        { label: "Posts", value: "posts" },
      ]),
    [filteredVillages]
  );

  async function saveVillage(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingVillage) {
        await api.put(`/api/admin/villages/${editingVillage.id}`, {
          name: editingVillage.name,
          slug: editingVillage.slug || slugify(editingVillage.name),
        });
        showToast?.({ type: "success", title: "Village updated", message: "Changes were saved successfully." });
        setEditingVillage(null);
      } else {
        await api.post("/api/admin/villages", {
          name: creatingVillage?.name,
          slug: creatingVillage?.slug || slugify(creatingVillage?.name),
        });
        showToast?.({ type: "success", title: "Village created", message: "New village was added successfully." });
        setCreatingVillage(null);
      }
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || error.message || "Unable to save village." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(village) {
    setConfirmDeleteVillage(village);
  }

  async function handleConfirmDeleteVillage() {
    if (!confirmDeleteVillage) return;
    setActionId(confirmDeleteVillage.id);
    try {
      await api.delete(`/api/admin/villages/${confirmDeleteVillage.id}`);
      showToast?.({ type: "success", title: "Village deleted", message: "Village was removed from the database." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || error.message || "Unable to delete village." });
    } finally {
      setActionId(null);
      setConfirmDeleteVillage(null);
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
      <PageHeader title="Villages" subtitle="Keep village records, counts, and assignments in sync with MySQL." />

      <SectionCard
        title="Village Management"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => downloadCsv("connectnkt-villages.csv", csvRows)} disabled={!filteredVillages.length}>
              <FiDownload /> Export CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setEditingVillage(null);
              setCreatingVillage({ name: "", slug: "" });
            }}>
              <FiPlus /> Add Village
            </button>
          </div>
        }
      >
        <div className="admin-toolbar" style={{ marginBottom: 14 }}>
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search village name or slug..." style={{ paddingLeft: 40 }} />
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredVillages.length ? (
          <>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Village Name</th>
                    <th>Slug</th>
                    <th>Users</th>
                    <th>Posts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedVillages.map((village, index) => (
                    <tr key={village.id}>
                      <td>{start + index}</td>
                      <td><strong>{village.name}</strong></td>
                      <td>{village.slug || "N/A"}</td>
                      <td>{formatCount(village.users)}</td>
                      <td>{formatCount(village.posts)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <AdminIconButton icon={<FiEdit2 />} label="Edit village" onClick={() => setEditingVillage({ ...village })} tone="primary" />
                          <AdminIconButton icon={<FiTrash2 />} label="Delete village" onClick={() => handleDelete(village)} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination" style={{ marginTop: 16 }}>
              <div className="muted">
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, filteredVillages.length)} of {filteredVillages.length}
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
          <EmptyState title="No villages found" message="Try a different search term or add a new village." />
        )}
      </SectionCard>

      <AdminModal
        open={Boolean(editingVillage) || Boolean(creatingVillage)}
        title={editingVillage ? "Edit Village" : "Add Village"}
        subtitle="Update the village name and slug used across the platform"
        onClose={() => {
          if (saving) return;
          setEditingVillage(null);
          setCreatingVillage(null);
        }}
        actions={<><button className="btn btn-secondary" type="button" onClick={() => { setEditingVillage(null); setCreatingVillage(null); }} disabled={saving}>Cancel</button><button className="btn btn-primary" type="submit" form="admin-village-form" disabled={saving}>{saving ? "Saving..." : "Save"}</button></>}
      >
        <form id="admin-village-form" className="admin-form-grid" onSubmit={saveVillage}>
          <input
            className="admin-field"
            value={editingVillage?.name ?? creatingVillage?.name ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingVillage) setEditingVillage((current) => ({ ...current, name: value, slug: current.slug || slugify(value) }));
              else setCreatingVillage((current) => ({ ...(current || {}), name: value, slug: (current?.slug || slugify(value)) }));
            }}
            placeholder="Village name"
          />
          <input
            className="admin-field"
            value={editingVillage?.slug ?? creatingVillage?.slug ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (editingVillage) setEditingVillage((current) => ({ ...current, slug: value }));
              else setCreatingVillage((current) => ({ ...(current || {}), slug: value }));
            }}
            placeholder="slug"
          />
          <div className="admin-full muted">Counts are sourced directly from MySQL joins and cannot be hand-edited here.</div>
        </form>
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(confirmDeleteVillage)}
        title={confirmDeleteVillage ? `Delete village ${confirmDeleteVillage.name}?` : "Delete village?"}
        message="This action cannot be undone."
        confirmLabel="Delete village"
        cancelLabel="Cancel"
        loading={actionId === confirmDeleteVillage?.id}
        onConfirm={handleConfirmDeleteVillage}
        onClose={() => setConfirmDeleteVillage(null)}
      />
    </div>
  );
}
