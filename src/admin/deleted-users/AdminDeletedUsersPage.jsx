import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiArchive, FiDownload, FiEye, FiSearch, FiTrash2, FiUsers, FiCalendar } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminIconButton from "../components/AdminIconButton";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatCount, formatDate } from "../../utils/formatters";
import { asArray, buildCsv, downloadCsv, downloadPdf } from "../utils/adminData";

const PAGE_SIZE = 10;

export default function AdminDeletedUsersPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [deletedByFilter, setDeletedByFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const term = query.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(term), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Construct backend query path
  const pathParts = [];
  if (debouncedQuery) pathParts.push(`q=${encodeURIComponent(debouncedQuery)}`);
  if (deletedByFilter !== "all") pathParts.push(`deleted_by=${encodeURIComponent(deletedByFilter)}`);
  if (accountTypeFilter !== "all") pathParts.push(`account_type=${encodeURIComponent(accountTypeFilter)}`);
  if (startDate) pathParts.push(`start_date=${encodeURIComponent(startDate)}`);
  if (endDate) pathParts.push(`end_date=${encodeURIComponent(endDate)}`);

  const path = pathParts.length ? `/api/admin/deleted-users?${pathParts.join("&")}` : "/api/admin/deleted-users";

  const { data: deletedUsersData = [], loading, refetch } = useApiResource(path, {
    initialData: [],
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Deleted Users";
    window.dispatchEvent(new Event("admin-user-counts-update"));
  }, []);

  const deletedUsers = useMemo(() => asArray(deletedUsersData), [deletedUsersData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, deletedByFilter, accountTypeFilter, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(deletedUsers.length / PAGE_SIZE));
  const pagedUsers = deletedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const csvRows = useMemo(
    () =>
      buildCsv(deletedUsers, [
        { label: "Name", value: "name" },
        { label: "Username", value: "username" },
        { label: "Email", value: "email" },
        { label: "Phone", value: "phone" },
        { label: "Account Type", value: "accountType" },
        { label: "Delete Reason", value: "deleteReason" },
        { label: "Deleted By", value: "deletedBy" },
        { label: "Deleted Date", value: "deletedAt" },
        { label: "Status", value: "accountStatus" },
      ]),
    [deletedUsers]
  );

  const pdfColumns = useMemo(
    () => [
      { label: "Name", value: "name" },
      { label: "Username", value: "username" },
      { label: "Email", value: "email" },
      { label: "Phone", value: "phone" },
      { label: "Account Type", value: "accountType" },
      { label: "Delete Reason", value: "deleteReason" },
      { label: "Deleted By", value: "deletedBy" },
      { label: "Deleted Date", value: "deletedAt" },
      { label: "Status", value: "accountStatus" },
    ],
    []
  );

  async function openUserDetails(user) {
    setSelectedUser(user);
    setSelectedUserLoading(true);
    try {
      const response = await api.get(`/api/admin/deleted-users/${user.id}`);
      const payload = response?.data?.data ?? response?.data ?? {};
      setSelectedUser(payload);
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Details load failed",
        message: error?.response?.data?.message || error.message || "Unable to load details.",
      });
    } finally {
      setSelectedUserLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteUser) return;
    setDeletingId(confirmDeleteUser.id);
    try {
      await api.delete(`/api/admin/deleted-users/${confirmDeleteUser.id}`);
      showToast?.({
        type: "success",
        title: "Record Permanently Deleted",
        message: "Deleted user record permanently removed.",
      });
      refetch();
      window.dispatchEvent(new Event("admin-user-counts-update"));
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Delete failed",
        message: error?.response?.data?.message || error.message || "Failed to permanently delete record.",
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteUser(null);
    }
  }

  const start = deletedUsers.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  return (
    <div className="admin-users-page" style={{ padding: "16px 20px" }}>
      <style>{`
        /* Reuse styles for consistency */
        .admin-users-page * {
          box-sizing: border-box;
        }
        .admin-users-page .search-bar-container {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          padding: 16px !important;
          background: #f8fafc !important;
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          margin-bottom: 20px !important;
          align-items: center !important;
        }
        .admin-users-page .search-input-wrapper {
          flex: 1 1 200px !important;
          min-width: 150px !important;
          position: relative !important;
        }
        .admin-users-page .search-input-wrapper input {
          width: 100% !important;
          padding: 10px 16px 10px 44px !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          outline: none !important;
          background: white !important;
          transition: all 0.2s !important;
        }
        .admin-users-page .search-input-wrapper input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
        }
        .admin-users-page .search-icon {
          position: absolute !important;
          left: 14px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: #94a3b8 !important;
          font-size: 18px !important;
        }
        .admin-users-page .date-filter-wrapper {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          flex: 1 1 300px !important;
        }
        .admin-users-page .date-input {
          padding: 8px 12px !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          outline: none !important;
          background: white !important;
          color: #334155 !important;
        }
        .admin-users-page .export-buttons {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          flex: 0 1 auto !important;
        }
        .admin-users-page .export-btn {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 10px 16px !important;
          background: white !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #475569 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          white-space: nowrap !important;
        }
        .admin-users-page .export-btn:hover:not(:disabled) {
          border-color: #3b82f6 !important;
          color: #1e40af !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(59,130,246,0.15) !important;
        }
        .admin-users-page .export-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .admin-users-page .filters-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          margin-bottom: 20px !important;
        }
        .admin-users-page .filters-row select {
          flex: 1 1 140px !important;
          min-width: 120px !important;
          padding: 8px 12px !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          background: white !important;
          color: #334155 !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.2s !important;
        }
        .admin-users-page .filters-row select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
        }
        .admin-users-page .table-wrap {
          overflow-x: auto !important;
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          background: white !important;
          width: 100% !important;
        }
        .admin-users-page .table-wrap table {
          width: 100% !important;
          min-width: 1100px !important;
          border-collapse: collapse !important;
          font-size: 14px !important;
        }
        .admin-users-page .table-wrap th {
          background: #f8fafc !important;
          font-weight: 600 !important;
          color: #475569 !important;
          border-bottom: 2px solid #e2e8f0 !important;
          padding: 12px 10px !important;
          text-align: left !important;
          white-space: nowrap;
        }
        .admin-users-page .table-wrap td {
          padding: 10px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          white-space: nowrap;
        }
        .admin-users-page .pagination {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 16px !important;
        }
        .admin-users-page .pagination .controls {
          display: flex !important;
          gap: 8px !important;
        }
        .admin-users-page .pagination .controls button {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          background: white !important;
          cursor: pointer !important;
          font-size: 14px !important;
          color: #475569 !important;
        }
        .admin-users-page .pagination .controls button:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }
        .admin-users-page .pagination .controls .page-badge {
          padding: 6px 14px !important;
          background: #f1f5f9 !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }
        @media (prefers-color-scheme: dark) {
          .admin-users-page .search-bar-container {
            background: #1e293b !important;
            border-color: #334155 !important;
          }
          .admin-users-page .search-input-wrapper input,
          .admin-users-page .filters-row select,
          .admin-users-page .date-input {
            background: #0f172a !important;
            border-color: #334155 !important;
            color: #e2e8f0 !important;
          }
          .admin-users-page .table-wrap {
            background: #1e293b !important;
            border-color: #334155 !important;
          }
          .admin-users-page .table-wrap th {
            background: #0f172a !important;
            color: #94a3b8 !important;
            border-bottom-color: #334155 !important;
          }
          .admin-users-page .table-wrap td {
            border-bottom-color: #334155 !important;
            color: #e2e8f0 !important;
          }
          .admin-users-page .pagination .controls button {
            background: #1e293b !important;
            border-color: #334155 !important;
            color: #e2e8f0 !important;
          }
          .admin-users-page .pagination .controls .page-badge {
            background: #334155 !important;
            color: #e2e8f0 !important;
          }
        }
      `}</style>

      <PageHeader title="Deleted Users" subtitle="Audit soft-deleted accounts and permanently delete records." />

      <SectionCard title="Soft Deleted Users" style={{ padding: "20px" }}>
        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, username, email, or phone..."
            />
          </div>

          <div className="date-filter-wrapper">
            <FiCalendar size={16} style={{ color: "#94a3b8" }} />
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <span style={{ color: "#94a3b8" }}>to</span>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>

          <div className="export-buttons">
            <button
              type="button"
              className="export-btn"
              onClick={() => downloadCsv("connectnkt-deleted-users.csv", csvRows)}
              disabled={!deletedUsers.length}
            >
              <FiDownload size={16} /> CSV
            </button>
            <button
              type="button"
              className="export-btn"
              onClick={() => downloadPdf("connectnkt-deleted-users.pdf", deletedUsers, pdfColumns)}
              disabled={!deletedUsers.length}
            >
              <FiDownload size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="filters-row">
          <select value={deletedByFilter} onChange={(e) => setDeletedByFilter(e.target.value)}>
            <option value="all">👥 All Deleted By</option>
            <option value="user">👤 User Self-Delete</option>
            <option value="admin">👮 Admin Deleted</option>
          </select>

          <select value={accountTypeFilter} onChange={(e) => setAccountTypeFilter(e.target.value)}>
            <option value="all">📊 All Account Types</option>
            <option value="personal">👤 Personal</option>
            <option value="business">💼 Business</option>
          </select>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : deletedUsers.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "50px", textAlign: "center" }}>#</th>
                    <th style={{ width: "150px" }}>Name</th>
                    <th style={{ width: "120px" }}>Username</th>
                    <th style={{ width: "150px" }}>Email</th>
                    <th style={{ width: "120px" }}>Phone</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Account Type</th>
                    <th style={{ width: "150px" }}>Delete Reason</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Deleted By</th>
                    <th style={{ width: "130px" }}>Deleted Date</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                    <th style={{ minWidth: "180px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td style={{ textAlign: "center" }}>{start + index}</td>
                      <td>{user.name || "Unnamed user"}</td>
                      <td>@{user.username || "unknown"}</td>
                      <td>{user.email || "N/A"}</td>
                      <td>{user.phone || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{user.accountType}</td>
                      <td>{user.deleteReason || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{user.deletedBy === "admin" ? "Admin" : "User"}</td>
                      <td>{user.deletedAt ? formatDate(user.deletedAt) : "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{user.accountStatus}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <AdminIconButton
                            icon={<FiEye />}
                            label="View Details"
                            onClick={() => openUserDetails(user)}
                            tone="primary"
                            className="icon-btn"
                          />
                          <AdminIconButton
                            icon={<FiTrash2 />}
                            label="Permanently Delete"
                            onClick={() => setConfirmDeleteUser(user)}
                            tone="danger"
                            className="icon-btn"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="info">
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, deletedUsers.length)} of {deletedUsers.length}
              </div>
              <div className="controls">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((val) => Math.max(1, val - 1))}
                >
                  Previous
                </button>
                <span className="page-badge">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((val) => Math.min(pageCount, val + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No deleted users found" message="Soft deleted user accounts will appear here." />
        )}
      </SectionCard>

      {/* View Details Modal */}
      <AdminModal
        open={Boolean(selectedUser)}
        title="Deleted User Full Details"
        subtitle="Archived profile information and account statistics"
        size="xl"
        onClose={() => {
          setSelectedUser(null);
          setSelectedUserLoading(false);
        }}
      >
        {selectedUserLoading && !selectedUser ? (
          <SkeletonCard />
        ) : selectedUser ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Name:</strong> {selectedUser.name || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Username:</strong> @{selectedUser.username || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Email:</strong> {selectedUser.email || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Phone:</strong> {selectedUser.phone || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Village:</strong> {selectedUser.villageName || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Gender:</strong> {selectedUser.gender || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Date of Birth:</strong> {selectedUser.dateOfBirth || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Account Type:</strong> {selectedUser.accountType}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Followers Count:</strong> {formatCount(selectedUser.totalFollowers || 0)}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Following Count:</strong> {formatCount(selectedUser.totalFollowing || 0)}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Posts Count:</strong> {formatCount(selectedUser.totalPosts || 0)}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Comments Count:</strong> {formatCount(selectedUser.totalComments || 0)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Deleted By:</strong> {selectedUser.deletedBy === "admin" ? "Admin" : "User"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Deleted Date:</strong> {selectedUser.deletedAt ? formatDate(selectedUser.deletedAt) : "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Delete Reason:</strong> {selectedUser.deleteReason || "N/A"}
              </div>
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>Custom Message:</strong> {selectedUser.customReason || "N/A"}
              </div>
            </div>

            {selectedUser.bio && (
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px" }}>
                <strong>About (Bio):</strong>
                <p style={{ margin: "4px 0 0", color: "#64748b", lineHeight: 1.6 }}>{selectedUser.bio}</p>
              </div>
            )}

            {selectedUser.businesses?.length ? (
              <div>
                <h4 style={{ margin: "4px 0 10px", fontSize: "15px", fontWeight: "600" }}>Linked Business Records</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedUser.businesses.map((business) => (
                    <div key={business.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{business.businessName || "Unnamed business"}</div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: 4 }}>
                        Owner: {business.ownerName || "N/A"} • Phone: {business.phone || "N/A"} • Email:{" "}
                        {business.email || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: 4 }}>
                        Category: {business.categoryName || "N/A"} • Village: {business.villageName || "N/A"} • Status:{" "}
                        {business.status || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      {/* Permanent Delete Confirmation Modal */}
      <AdminConfirmationModal
        open={Boolean(confirmDeleteUser)}
        title={
          confirmDeleteUser
            ? `Permanently delete record of ${confirmDeleteUser.name || confirmDeleteUser.username}?`
            : "Permanently delete record?"
        }
        message="CAUTION: This action is irreversible. The archived user data and the main user account will be permanently erased from the system."
        confirmLabel="Permanently Delete"
        cancelLabel="Cancel"
        loading={deletingId === confirmDeleteUser?.id}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteUser(null)}
      />
    </div>
  );
}
