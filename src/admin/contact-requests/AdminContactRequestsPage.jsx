import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiCheck, FiEdit3, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminIconButton from "../components/AdminIconButton";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import { useApiResource } from "../../api/useApiResource";
import { formatDate } from "../../utils/formatters";
import { matchesSearchQuery } from "../../utils/search";
import api from "../../services/api";

const statuses = ["all", "pending", "in_progress", "resolved", "closed"];

function normalize(row) {
  return {
    ...row,
    status: row.status === "new" ? "pending" : row.status || "pending",
    responseMessage: row.responseMessage ?? row.response_message ?? "",
    createdAt: row.createdAt ?? row.created_at,
  };
}

export default function AdminContactRequestsPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [reply, setReply] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data = [], loading, refetch } = useApiResource("/api/contact-queries", {
    initialData: [],
    transform: (value) => (Array.isArray(value) ? value.map(normalize) : []),
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Contact Requests";
  }, []);

  const rows = useMemo(() => {
    return data
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => matchesSearchQuery(query, [item.name, item.email, item.category, item.subject, item.message, item.responseMessage]))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [data, query, status]);

  function openReply(item) {
    setEditing(item);
    setReply(item.responseMessage || "");
  }

  async function updateRequest(id, payload, message) {
    setSaving(true);
    try {
      await api.put(`/api/contact-queries/${id}`, payload);
      showToast?.({ type: "success", title: "Updated", message });
      setEditing(null);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Update failed", message: error?.response?.data?.message || error.message || "Unable to update request." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/api/contact-queries/${deleteTarget.id}`);
      showToast?.({ type: "success", title: "Deleted", message: "Contact request deleted." });
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || error.message || "Unable to delete request." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack responsive-admin-page">
      <PageHeader title="Contact Requests" subtitle="View, search, reply, resolve, close, and delete support messages." />
      <SectionCard
        title="Support Inbox"
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="search-shell" style={{ padding: 8 }}>
              <FiSearch className="muted" />
              <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests" style={{ border: 0, background: "transparent", minWidth: 220 }} />
            </div>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All Statuses" : item.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <SkeletonCard />
        ) : rows.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.email}</div>
                    </td>
                    <td>
                      <strong>{item.subject}</strong>
                      <div className="muted">{item.message}</div>
                    </td>
                    <td>{item.category}</td>
                    <td><span className="admin-status-pill">{item.status.replace("_", " ")}</span></td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <AdminIconButton icon={<FiEdit3 />} label="Reply" onClick={() => openReply(item)} />
                        <AdminIconButton icon={<FiCheck />} label="Resolve" tone="success" onClick={() => updateRequest(item.id, { status: "resolved" }, "Request marked resolved.")} />
                        <AdminIconButton icon={<FiTrash2 />} label="Delete" tone="danger" onClick={() => setDeleteTarget(item)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No contact requests found" message="Try another search or status filter." />
        )}
      </SectionCard>

      <AdminModal
        open={Boolean(editing)}
        title="Reply to Contact Request"
        subtitle={editing ? `${editing.name} - ${editing.email}` : ""}
        onClose={() => setEditing(null)}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => updateRequest(editing.id, { response_message: reply, status: editing.status || "in_progress" }, "Reply saved successfully.")}>
              {saving ? "Saving..." : "Save Reply"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="stack">
            <div><strong>{editing.subject}</strong></div>
            <div className="muted">{editing.message}</div>
            <textarea className="admin-textarea" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write admin reply..." rows={8} />
            <select className="field" value={editing.status} onChange={(event) => setEditing((value) => ({ ...value, status: event.target.value }))}>
              {statuses.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
            </select>
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete Contact Request"
        message={`Delete "${deleteTarget?.subject || "this request"}"?`}
        confirmLabel="Delete"
        onConfirm={deleteRequest}
        onClose={() => setDeleteTarget(null)}
        loading={saving}
      />
    </div>
  );
}
