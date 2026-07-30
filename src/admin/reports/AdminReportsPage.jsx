import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiDownload, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import AdminIconButton from "../components/AdminIconButton";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";
import { asArray, buildCsv, downloadCsv, normalizeReport } from "../utils/adminData";

const PAGE_SIZE = 10;

export default function AdminReportsPage({ mode = "all" }) {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(null);
  const [actionId, setActionId] = useState(null);
  const reportConfig = {
    all: {
      title: "Reports",
      subtitle: "Review moderation reports and resolve them against live records.",
      sectionTitle: "Report Queue",
      endpoint: "/api/admin/reports",
      exportName: "connectnkt-reports.csv",
    },
    posts: {
      title: "Post Reports",
      subtitle: "Review post reports by reported user, reporter, and reason.",
      sectionTitle: "Post Report Queue",
      endpoint: "/api/admin/reports/posts",
      exportName: "connectnkt-post-reports.csv",
    },
    users: {
      title: "User Reports",
      subtitle: "Review user reports by reported username and reporter username.",
      sectionTitle: "User Report Queue",
      endpoint: "/api/admin/reports/users",
      exportName: "connectnkt-user-reports.csv",
    },
  }[mode] || {};
  const baseEndpoint = reportConfig.endpoint || "/api/admin/reports";
  const path = query.trim() ? `${baseEndpoint}?q=${encodeURIComponent(query.trim())}` : baseEndpoint;
  const { data: reportsData = [], loading, refetch } = useApiResource(path, { initialData: [] });

  useEffect(() => {
    document.title = `ConnectNKT Admin | ${reportConfig.title}`;
  }, [reportConfig.title]);

  const reports = useMemo(() => asArray(reportsData).map(normalizeReport), [reportsData]);
  const filteredReports = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return reports
      .slice()
      .filter((report) => statusFilter === "all" || report.status === statusFilter)
      .filter((report) =>
        [report.reason, report.customReason, report.status, report.reportedBy, report.postAuthorUsername, report.reportedUserUsername, report.targetUsername]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(lowered)
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [query, reports, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const pagedReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = filteredReports.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const csvRows = useMemo(
    () =>
      buildCsv(filteredReports, [
        { label: "Report Type", value: "reportType" },
        { label: "Reported User", value: "targetUsername" },
        { label: "Reason", value: "reason" },
        { label: "Custom Reason", value: "customReason" },
        { label: "Status", value: "status" },
        { label: "Reported By", value: "reportedBy" },
        { label: "Created", value: "createdAt" },
      ]),
    [filteredReports]
  );

  async function updateReport(report, payload, successMessage = "Report updated.") {
    const status = payload.status || report.status;
    setActionId(`${report.id}-${status}`);
    try {
      await api.put(`/api/admin/reports/${report.id}`, payload);
      showToast?.({ type: "success", title: "Report updated", message: successMessage });
      refetch();
      setEditingReport(null);
    } catch (error) {
      showToast?.({ type: "error", title: "Action failed", message: error?.response?.data?.message || error.message || "Unable to update report." });
    } finally {
      setActionId(null);
    }
  }

  async function setStatus(report, status) {
    await updateReport(report, { status }, `Report marked as ${status}.`);
  }

  async function handleDelete(report) {
    setConfirmDeleteReport(report);
  }

  async function handleConfirmDeleteReport() {
    if (!confirmDeleteReport) return;
    setActionId(`${confirmDeleteReport.id}-delete`);
    try {
      await api.delete(`/api/admin/reports/${confirmDeleteReport.id}`);
      showToast?.({ type: "success", title: "Report deleted", message: "The report record was removed." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || error.message || "Unable to delete report." });
    } finally {
      setActionId(null);
      setConfirmDeleteReport(null);
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
        .responsive-admin-page .admin-toolbar select {
          width: clamp(140px, 30vw, 170px) !important;
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
          .responsive-admin-page .admin-toolbar select {
            width: 100% !important;
          }
          .responsive-admin-page .admin-table-wrap table {
            font-size: 12px !important;
          }
          .responsive-admin-page .admin-table-wrap th,
          .responsive-admin-page .admin-table-wrap td {
            padding: 10px 8px !important;
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
          .responsive-admin-page .btn {
            padding: 3px 5px !important;
            font-size: 8px !important;
          }
        }
      `}</style>
      <PageHeader title={reportConfig.title} subtitle={reportConfig.subtitle} />

      <SectionCard
        title={reportConfig.sectionTitle}
        action={
          <button type="button" className="btn btn-secondary" onClick={() => downloadCsv(reportConfig.exportName, csvRows)} disabled={!filteredReports.length}>
            <FiDownload /> Export CSV
          </button>
        }
      >
        <div className="admin-toolbar" style={{ marginBottom: 14 }}>
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, reason, reporter..." style={{ paddingLeft: 40 }} />
          </div>
          <select className="field" style={{ width: 170 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredReports.length ? (
          <>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    {mode === "all" ? <th>Type</th> : null}
                    <th>Reported User</th>
                    {mode !== "users" ? <th>Reason</th> : null}
                    {mode !== "users" ? <th>Custom Reason</th> : null}
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReports.map((report, index) => (
                    <tr key={report.id}>
                      {mode === "all" ? <td>{report.reportType}</td> : null}
                      <td>@{report.targetUsername || report.reportedUserUsername || report.postAuthorUsername || "unknown"}</td>
                      {mode !== "users" ? <td>{report.reason}</td> : null}
                      {mode !== "users" ? <td>{report.customReason || "N/A"}</td> : null}
                      <td>{report.status}</td>
                      <td>@{report.reportedBy || "unknown"}</td>
                      <td>{report.createdAt ? formatDate(report.createdAt) : "N/A"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn btn-secondary" type="button" onClick={() => setSelectedReport(report)}>View</button>
                          <button className="btn btn-secondary" type="button" onClick={() => setEditingReport(report)}>Edit</button>
                          <button className="btn btn-secondary" type="button" disabled={actionId === `${report.id}-resolved`} onClick={() => setStatus(report, "resolved")}>Resolve</button>
                          <button className="btn btn-secondary" type="button" disabled={actionId === `${report.id}-dismissed`} onClick={() => setStatus(report, "dismissed")}>Dismiss</button>
                          <AdminIconButton icon={<FiTrash2 />} label="Delete report" onClick={() => handleDelete(report)} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination" style={{ marginTop: 16 }}>
              <div className="muted">
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, filteredReports.length)} of {filteredReports.length}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                <span className="admin-badge">{page} / {pageCount}</span>
                <button className="btn btn-secondary" type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No reports found" message="Try changing the filters or search term." />
        )}
      </SectionCard>

      <AdminModal open={Boolean(selectedReport)} title="Report Details" subtitle="Full moderation record from the database" onClose={() => setSelectedReport(null)}>
        {selectedReport ? (
          <div className="admin-preview" style={{ gap: 12 }}>
            <div className="admin-form-grid">
              <div className="admin-badge">Type: {selectedReport.reportType}</div>
              <div className="admin-badge">Status: {selectedReport.status}</div>
              <div className="admin-badge">Reporter: @{selectedReport.reportedBy || "unknown"}</div>
              <div className="admin-badge">Reported User: @{selectedReport.targetUsername || selectedReport.reportedUserUsername || selectedReport.postAuthorUsername || "unknown"}</div>
            </div>
            <div className="admin-badge">Reason: {selectedReport.reason || "N/A"}</div>
            <div className="admin-badge">Custom Reason: {selectedReport.customReason || "N/A"}</div>
            <div className="admin-badge">Created: {selectedReport.createdAt ? formatDate(selectedReport.createdAt) : "N/A"}</div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={Boolean(editingReport)} title="Edit Report" subtitle="Update moderation status" onClose={() => setEditingReport(null)}>
        {editingReport ? (
          <form
            className="admin-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              updateReport(
                editingReport,
                {
                  status: String(form.get("status") || "pending"),
                  moderation_notes: String(form.get("moderation_notes") || ""),
                },
                "Report moderation status saved."
              );
            }}
          >
            <label>
              Status
              <select className="field" name="status" defaultValue={editingReport.status || "pending"}>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea className="field" name="moderation_notes" defaultValue={editingReport.customReason || ""} rows={4} />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", gridColumn: "1 / -1" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingReport(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={Boolean(actionId)}>Save</button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(confirmDeleteReport)}
        title={confirmDeleteReport ? `Delete report #${confirmDeleteReport.id}?` : "Delete report?"}
        message="This report record will be permanently removed."
        confirmLabel="Delete report"
        cancelLabel="Cancel"
        loading={actionId === `${confirmDeleteReport?.id}-delete`}
        onConfirm={handleConfirmDeleteReport}
        onClose={() => setConfirmDeleteReport(null)}
      />
    </div>
  );
}
