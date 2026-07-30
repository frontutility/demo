import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { FiDownload, FiEdit2, FiEye, FiSearch, FiTrash2, FiUsers, FiUserCheck, FiUserX, FiShield } from "react-icons/fi";
import { MdBlock, MdVisibility, MdVisibilityOff } from "react-icons/md";
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
import { asArray, buildCsv, downloadCsv, downloadPdf, normalizeUser } from "../utils/adminData";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { showToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [blueTickFilter, setBlueTickFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [page, setPage] = useState(1);
  const [villageFilter, setVillageFilter] = useState("");
  const [birthdayFilter, setBirthdayFilter] = useState(searchParams.get("birthday") || "");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserOriginal, setEditingUserOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // Debounce search query
  useEffect(() => {
    const term = query.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(term), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Build API path with filters
  const pathParts = [];
  if (debouncedQuery) pathParts.push(`q=${encodeURIComponent(debouncedQuery)}`);
  if (villageFilter) pathParts.push(`village=${encodeURIComponent(villageFilter)}`);
  if (birthdayFilter) pathParts.push(`birthday=${encodeURIComponent(birthdayFilter)}`);
  const path = pathParts.length ? `/api/admin/users?${pathParts.join('&')}` : "/api/admin/users";

  // Fetch users data
  const {
    data: usersData = [],
    loading,
    refetch
  } = useApiResource(path, {
    initialData: [],
    transform: (value) => asArray(value).map(normalizeUser),
  });

  // Fetch villages for filter
  const { data: villages = [] } = useApiResource('/api/admin/villages', { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Users";
  }, []);

  const users = useMemo(() => asArray(usersData), [usersData]);

  const filteredUsers = useMemo(() => {
    let rows = users.slice();

    if (statusFilter !== "all") {
      rows = rows.filter((user) => user.accountStatus === statusFilter);
    }
    if (blueTickFilter !== "all") {
      rows = rows.filter((user) => user.blueTickStatus === blueTickFilter);
    }

    rows.sort((a, b) => {
      if (sortBy === "name-asc") return String(a.name).localeCompare(String(b.name));
      if (sortBy === "name-desc") return String(b.name).localeCompare(String(a.name));
      if (sortBy === "followers-desc") return (b.followers || 0) - (a.followers || 0);
      if (sortBy === "posts-desc") return (b.posts || 0) - (a.posts || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return rows;
  }, [blueTickFilter, sortBy, statusFilter, users]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, villageFilter, statusFilter, blueTickFilter, sortBy, birthdayFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const csvRows = useMemo(
    () =>
      buildCsv(filteredUsers, [
        { label: "Name", value: "name" },
        { label: "Username", value: "username" },
        { label: "Email", value: "email" },
        { label: "Phone", value: "mobile" },
        { label: "Village", value: "villageName" },
        { label: "Followers", value: (row) => row.followers || 0 },
        { label: "Following", value: (row) => row.following || 0 },
        { label: "Posts", value: (row) => row.posts || 0 },
        { label: "Comments", value: (row) => row.comments || 0 },
        { label: "Agrees", value: (row) => row.agreeCount || 0 },
        { label: "Disagrees", value: (row) => row.disagreeCount || 0 },
        { label: "Shares", value: (row) => row.shares || 0 },
        { label: "Blue Tick", value: "blueTickStatus" },
        { label: "Status", value: "accountStatus" },
      ]),
    [filteredUsers]
  );

  const pdfColumns = useMemo(
    () => [
      { label: "Name", value: "name" },
      { label: "Username", value: "username" },
      { label: "Email", value: "email" },
      { label: "Phone", value: "mobile" },
      { label: "Village", value: "villageName" },
      { label: "Followers", value: (row) => row.followers || 0 },
      { label: "Following", value: (row) => row.following || 0 },
      { label: "Posts", value: (row) => row.posts || 0 },
      { label: "Comments", value: (row) => row.comments || 0 },
      { label: "Agrees", value: (row) => row.agreeCount || 0 },
      { label: "Disagrees", value: (row) => row.disagreeCount || 0 },
      { label: "Shares", value: (row) => row.shares || 0 },
      { label: "Blue Tick", value: "blueTickStatus" },
      { label: "Status", value: "accountStatus" },
    ],
    []
  );

  async function mutateUser(id, actionKey, action, successMessage) {
    if (actionId) return;
    setActionId(actionKey);
    try {
      await action();
      showToast?.({ type: "success", title: "Saved", message: successMessage });
      refetch();
      window.dispatchEvent(new Event("admin-user-counts-update"));
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Action failed",
        message: error?.response?.data?.message || error.message || "Unable to complete action.",
      });
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(user) {
    setConfirmDeleteUser(user);
  }

  async function handleConfirmDeleteUser() {
    if (!confirmDeleteUser) return;
    await mutateUser(
      confirmDeleteUser.id,
      "delete",
      () => api.delete(`/api/admin/users/${confirmDeleteUser.id}`),
      "User deleted successfully."
    );
    setConfirmDeleteUser(null);
  }

  function buildActionConfirmation(user, type, nextStatus) {
    const userName = user?.name ? user.name : user?.username ? `@${user.username}` : `User ${user?.id ?? 'unknown'}`;
    if (type === "status") {
      return {
        title: `Confirm account status change`,
        message: `Change ${userName}'s account status to ${nextStatus}? This will modify how their profile and posts are shown.`,
        confirmLabel: `Set ${nextStatus}`,
      };
    }

    if (type === "blueTick") {
      const label = nextStatus === "verified" ? "Grant blue tick" : "Remove blue tick";
      return {
        title: `${label} confirmation`,
        message: `${label} for ${userName}? This will update the user's blue tick verification status.`,
        confirmLabel: label,
      };
    }

    return {
      title: "Confirm action",
      message: `Are you sure you want to perform this action for ${userName}?`,
      confirmLabel: "Confirm",
    };
  }

  function openConfirmAction(user, type, nextStatus) {
    setConfirmAction({
      user,
      type,
      nextStatus,
      ...buildActionConfirmation(user, type, nextStatus),
    });
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    const { user, type, nextStatus } = confirmAction;

    if (type === "status") {
      await mutateUser(
        user.id,
        `status-${nextStatus}`,
        () => api.patch(`/api/admin/users/${user.id}/visibility`, { status: nextStatus }),
        `User status updated to ${nextStatus}.`
      );
    } else if (type === "blueTick") {
      const message = nextStatus === "verified" ? "Blue tick granted." : "Blue tick removed.";
      await mutateUser(
        user.id,
        "blue-tick",
        () => api.patch(`/api/admin/users/${user.id}/blue-tick`, { status: nextStatus }),
        message
      );
    }

    setConfirmAction(null);
  }

  async function openUserDetails(user) {
    setSelectedUser(normalizeUser(user));
    setSelectedUserLoading(true);
    try {
      const response = await api.get(`/api/admin/users/${user.id}`);
      const payload = response?.data?.data ?? response?.data?.user ?? response?.data ?? {};
      setSelectedUser(normalizeUser(payload));
    } catch (error) {
      showToast?.({
        type: "error",
        title: "User load failed",
        message: error?.response?.data?.message || error.message || "Unable to load user details.",
      });
    } finally {
      setSelectedUserLoading(false);
    }
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const original = editingUserOriginal || {};
      const payload = {
        name: editingUser.name,
        username: editingUser.username,
        email: editingUser.email,
        mobile: editingUser.mobile,
        bio: editingUser.bio,
        father_name: editingUser.father_name,
        gender: editingUser.gender,
        date_of_birth: editingUser.date_of_birth,
        village_id: editingUser.villageId || null,
        can_create_image_post: editingUser.canCreateImagePost ? 1 : 0,
        can_create_image_text_post: editingUser.canCreateImageTextPost ? 1 : 0,
        blue_tick_status: editingUser.blueTickStatus,
        account_status: editingUser.accountStatus,
        show_in_search: editingUser.searchVisibility ? 1 : 0,
      };

      if (editingUser.followers !== original.followers) payload.followers_count_override = editingUser.followers;
      if (editingUser.following !== original.following) payload.following_count_override = editingUser.following;
      if (editingUser.posts !== original.posts) payload.posts_count_override = editingUser.posts;
      if (editingUser.comments !== original.comments) payload.comments_count_override = editingUser.comments;
      if (editingUser.agreeCount !== original.agreeCount) payload.agree_count_override = editingUser.agreeCount;
      if (editingUser.disagreeCount !== original.disagreeCount) payload.disagree_count_override = editingUser.disagreeCount;
      if (editingUser.shares !== original.shares) payload.shares_count_override = editingUser.shares;

      await api.put(`/api/admin/users/${editingUser.id}`, payload);
      showToast?.({ type: "success", title: "User updated", message: "Changes were saved successfully." });
      setEditingUser(null);
      setEditingUserOriginal(null);
      refetch();
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Save failed",
        message: error?.response?.data?.message || error.message || "Unable to save user.",
      });
    } finally {
      setSaving(false);
    }
  }

  const start = filteredUsers.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  // Stats - Properly count users
  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: FiUsers,
      color: "blue",
      bgColor: "var(--surface-subtle, #eff6ff)", textColor: "var(--brand-2, #3b82f6)",
    },
    {
      label: "Active Users",
      value: users.filter((u) => u.accountStatus === "active" || u.accountStatus === "Active").length,
      icon: FiUserCheck,
      color: "green",
      bgColor: "rgba(var(--success-rgb, 15, 157, 88), 0.08)", textColor: "var(--success, #22c55e)",
    },
    {
      label: "Verified",
      value: users.filter((user) => user.blueTickStatus === "verified" || user.blueTickStatus === "Verified").length,
      icon: FiShield,
      color: "purple",
      bgColor: "rgba(var(--brand-2-rgb, 168, 85, 247), 0.08)", textColor: "var(--brand-2, #a855f7)",
    },
    {
      label: "Suspended",
      value: users.filter((user) => user.accountStatus === "suspended" || user.accountStatus === "Suspended").length,
      icon: FiUserX,
      color: "red",
      bgColor: "rgba(var(--danger-rgb, 220, 38, 38), 0.08)", textColor: "var(--danger, #ef4444)",
    },
  ];

  return (
    <div className="admin-users-page" style={{ padding: '16px 20px' }}>
      <style>{`
        /* ===== RESET & BASE ===== */
        .admin-users-page * {
          box-sizing: border-box;
        }
        .admin-users-page {
          max-width: 100%;
          overflow-x: hidden;
        }

        /* ===== SEARCH BAR ===== */
        .admin-users-page .search-bar-container {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          padding: 16px !important;
          background: var(--bg) !important;
          border-radius: 12px !important;
          border: 1px solid var(--line) !important;
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
          border: 2px solid var(--line) !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          outline: none !important;
          background: var(--bg-solid) !important;
          transition: all 0.2s !important;
        }
        .admin-users-page .search-input-wrapper input:focus {
          border-color: var(--brand-2) !important;
          box-shadow: 0 0 0 3px rgba(var(--brand-2-rgb, 59, 130, 246), 0.1) !important;
        }
        .admin-users-page .search-icon {
          position: absolute !important;
          left: 14px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: var(--text-secondary) !important;
          font-size: 18px !important;
        }
        .admin-users-page .village-select {
          flex: 1 1 160px !important;
          min-width: 130px !important;
        }
        .admin-users-page .village-select select {
          width: 100% !important;
          padding: 10px 12px !important;
          border: 2px solid var(--line) !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          background: var(--bg-solid) !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.2s !important;
        }
        .admin-users-page .village-select select:focus {
          border-color: var(--brand-2) !important;
          box-shadow: 0 0 0 3px rgba(var(--brand-2-rgb, 59, 130, 246), 0.1) !important;
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
          background: var(--bg-solid) !important;
          border: 2px solid var(--line) !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: var(--text) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          white-space: nowrap !important;
        }
        .admin-users-page .export-btn:hover:not(:disabled) {
          border-color: var(--brand-2) !important;
          color: var(--brand-2) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(var(--brand-2-rgb, 59, 130, 246),0.15) !important;
        }
        .admin-users-page .export-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        /* ===== FILTERS ROW ===== */
        .admin-users-page .filters-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
          margin-bottom: 20px !important;
          align-items: center !important;
        }
        .admin-users-page .filters-row select,
        .admin-users-page .filters-row input[type="date"] {
          flex: 1 1 140px !important;
          min-width: 120px !important;
          padding: 8px 12px !important;
          border: 2px solid var(--line) !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          background: var(--bg-solid) !important;
          color: var(--text) !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.2s !important;
        }
        .admin-users-page .filters-row select:focus,
        .admin-users-page .filters-row input[type="date"]:focus {
          border-color: var(--brand-2) !important;
          box-shadow: 0 0 0 3px rgba(var(--brand-2-rgb, 59, 130, 246), 0.1) !important;
        }
        .admin-users-page .filters-row .birthday-clear-btn {
          padding: 8px 14px !important;
          border: 2px solid var(--danger) !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          background: rgba(var(--danger-rgb, 220, 38, 38), 0.08) !important;
          color: var(--danger) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          white-space: nowrap !important;
          flex: 0 0 auto !important;
        }
        .admin-users-page .filters-row .birthday-clear-btn:hover {
          background: rgba(var(--danger-rgb, 220, 38, 38), 0.1) !important;
          border-color: var(--danger) !important;
        }

        /* ===== STATS CARDS ===== */
        .admin-users-page .stats-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 16px !important;
          margin-bottom: 24px !important;
        }
        .admin-users-page .stat-card {
          background: var(--bg-solid) !important;
          border: 1px solid var(--line) !important;
          border-radius: 12px !important;
          padding: 20px !important;
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          transition: all 0.2s !important;
          box-shadow: var(--shadow) !important;
        }
        .admin-users-page .stat-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: var(--shadow) !important;
        }
        .admin-users-page .stat-icon {
          width: 48px !important;
          height: 48px !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .admin-users-page .stat-icon svg {
          font-size: 24px !important;
        }
        .admin-users-page .stat-label {
          font-size: 13px !important;
          color: var(--text-secondary) !important;
          font-weight: 500 !important;
          margin-bottom: 2px !important;
        }
        .admin-users-page .stat-value {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: var(--text) !important;
          line-height: 1.2 !important;
        }

        /* ===== TABLE ===== */
        .admin-users-page .table-wrap {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          border-radius: 12px !important;
          border: 1px solid var(--line) !important;
          background: var(--bg-solid) !important;
          width: 100% !important;
        }
        .admin-users-page .table-wrap table {
          width: 100% !important;
          min-width: 1100px !important;
          border-collapse: collapse !important;
          font-size: 14px !important;
        }
        .admin-users-page .table-wrap th {
          background: var(--bg) !important;
          font-weight: 600 !important;
          color: var(--text) !important;
          border-bottom: 2px solid var(--line) !important;
          padding: 12px 10px !important;
          text-align: left !important;
          white-space: nowrap !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        .admin-users-page .table-wrap td {
          padding: 10px !important;
          border-bottom: 1px solid var(--line) !important;
          white-space: nowrap !important;
        }
        .admin-users-page .table-wrap td img {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
        }
        .admin-users-page .table-wrap .profile-placeholder {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 auto !important;
          background: var(--surface-subtle) !important;
          color: var(--text) !important;
          font-size: 14px !important;
          font-weight: 600 !important;
        }

        /* ===== ACTION ROW ===== */
        .admin-users-page .action-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          align-items: center !important;
          min-width: 460px !important;
        }
        .admin-users-page .action-row .btn-sm {
          padding: 3px 8px !important;
          font-size: 10px !important;
          border-radius: 6px !important;
          border: 1px solid var(--line) !important;
          background: var(--bg-solid) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          font-weight: 500 !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }
        .admin-users-page .action-row .btn-sm:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: var(--shadow) !important;
        }
        .admin-users-page .action-row .btn-sm:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }
        .admin-users-page .action-row .btn-primary {
          background: var(--brand-2) !important;
          color: var(--bg-solid) !important;
          border-color: var(--brand-2) !important;
        }
        .admin-users-page .action-row .btn-warning {
          background: var(--warning) !important;
          color: var(--bg-solid) !important;
          border-color: var(--warning) !important;
        }
        .admin-users-page .action-row .btn-danger {
          background: var(--danger) !important;
          color: var(--bg-solid) !important;
          border-color: var(--danger) !important;
        }
        .admin-users-page .action-row .btn-secondary {
          background: var(--bg) !important;
          color: var(--text) !important;
          border-color: var(--line) !important;
        }
        .admin-users-page .action-row .btn-secondary:hover:not(:disabled) {
          background: var(--line) !important;
        }
        .admin-users-page .action-row .icon-btn {
          flex-shrink: 0 !important;
          padding: 3px 6px !important;
          font-size: 10px !important;
        }

        /* ===== PAGINATION ===== */
        .admin-users-page .pagination {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 16px !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
        }
        .admin-users-page .pagination .info {
          color: var(--text-secondary) !important;
          font-size: 14px !important;
        }
        .admin-users-page .pagination .controls {
          display: flex !important;
          gap: 8px !important;
          align-items: center !important;
        }
        .admin-users-page .pagination .controls button {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          border: 1px solid var(--line) !important;
          background: var(--bg-solid) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: var(--text) !important;
        }
        .admin-users-page .pagination .controls button:hover:not(:disabled) {
          background: var(--bg) !important;
          border-color: var(--text-secondary) !important;
        }
        .admin-users-page .pagination .controls button:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }
        .admin-users-page .pagination .controls .page-badge {
          padding: 6px 14px !important;
          background: var(--bg) !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          color: var(--text) !important;
          font-weight: 600 !important;
        }

        /* ===== SCROLLBAR ===== */
        .admin-users-page .table-wrap::-webkit-scrollbar {
          height: 8px !important;
        }
        .admin-users-page .table-wrap::-webkit-scrollbar-track {
          background: var(--bg) !important;
          border-radius: 4px !important;
        }
        .admin-users-page .table-wrap::-webkit-scrollbar-thumb {
          background: var(--text-secondary) !important;
          border-radius: 4px !important;
        }

        /* ===== RESPONSIVE BREAKPOINTS ===== */

        /* Large screens: 4 stats in one row */
        @media (min-width: 1024px) {
          .admin-users-page .stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        /* Medium screens: 2 stats per row */
        @media (max-width: 1023px) and (min-width: 641px) {
          .admin-users-page .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Small screens: 1 stat per row */
        @media (max-width: 640px) {
          .admin-users-page .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-users-page .stat-card {
            padding: 16px !important;
          }
          .admin-users-page .stat-value {
            font-size: 24px !important;
          }
          .admin-users-page .stat-icon {
            width: 40px !important;
            height: 40px !important;
          }
          .admin-users-page .stat-icon svg {
            font-size: 20px !important;
          }
        }

        /* Search bar responsive */
        @media (max-width: 768px) {
          .admin-users-page .search-bar-container {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px !important;
          }
          .admin-users-page .search-input-wrapper {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
          .admin-users-page .village-select {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
          .admin-users-page .export-buttons {
            flex: 1 1 100% !important;
            justify-content: stretch !important;
          }
          .admin-users-page .export-btn {
            flex: 1 !important;
            justify-content: center !important;
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
        }

        /* Filters responsive */
        @media (max-width: 640px) {
          .admin-users-page .filters-row select {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
        }

        /* Table responsive */
        @media (max-width: 768px) {
          .admin-users-page .table-wrap table {
            font-size: 12px !important;
            min-width: 1000px !important;
          }
          .admin-users-page .table-wrap th,
          .admin-users-page .table-wrap td {
            padding: 8px 6px !important;
          }
          .admin-users-page .action-row .btn-sm {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          .admin-users-page .action-row .icon-btn {
            font-size: 9px !important;
            padding: 2px 4px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-users-page {
            padding: 8px 10px !important;
          }
          .admin-users-page .search-bar-container {
            padding: 10px !important;
          }
          .admin-users-page .table-wrap {
            border-radius: 8px !important;
          }
          .admin-users-page .table-wrap table {
            font-size: 10px !important;
            min-width: 850px !important;
          }
          .admin-users-page .table-wrap th,
          .admin-users-page .table-wrap td {
            padding: 6px 4px !important;
          }
          .admin-users-page .action-row {
            min-width: 350px !important;
            gap: 2px !important;
          }
          .admin-users-page .action-row .btn-sm {
            font-size: 8px !important;
            padding: 2px 4px !important;
          }
          .admin-users-page .action-row .icon-btn {
            font-size: 8px !important;
            padding: 2px 3px !important;
          }
          .admin-users-page .pagination {
            flex-direction: column !important;
            align-items: center !important;
          }
          .admin-users-page .pagination .controls button {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }

        }
      `}</style>

      <PageHeader title="Users" subtitle="Manage users, their blue tick status, visibility, and more." />

      <SectionCard title="User Management" style={{ padding: '20px' }}>
        {/* Search and Action Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, username, or village..."
            />
          </div>

          <div className="village-select">
            <select
              value={villageFilter}
              onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Villages</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="export-buttons">
            <button
              type="button"
              className="export-btn"
              onClick={() => downloadCsv("connectnkt-users.csv", csvRows)}
              disabled={!filteredUsers.length}
            >
              <FiDownload size={16} /> CSV
            </button>
            <button
              type="button"
              className="export-btn"
              onClick={() => downloadPdf("connectnkt-users.pdf", filteredUsers, pdfColumns)}
              disabled={!filteredUsers.length}
            >
              <FiDownload size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="filters-row">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">📊 All statuses</option>
            <option value="active">✅ Active</option>
            <option value="hidden">👻 Hidden</option>
            <option value="suspended">⛔ Suspended</option>
          </select>

          <select value={blueTickFilter} onChange={(event) => setBlueTickFilter(event.target.value)}>
            <option value="all">🔵 All blue ticks</option>
            <option value="none">⚪ None</option>
            <option value="pending">⏳ Pending</option>
            <option value="verified">✅ Verified</option>
            <option value="rejected">❌ Rejected</option>
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="createdAt-desc">🕐 Newest first</option>
            <option value="name-asc">🔤 Name A-Z</option>
            <option value="name-desc">🔤 Name Z-A</option>
            <option value="followers-desc">👥 Most followers</option>
            <option value="posts-desc">📝 Most posts</option>
          </select>

          <input
            type="date"
            id="birthday-filter"
            title="Filter by Birthday (day &amp; month only)"
            value={birthdayFilter}
            onChange={(event) => {
              const value = event.target.value;
              setBirthdayFilter(value);
              if (value) {
                setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("birthday", value); return next; });
              } else {
                setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("birthday"); return next; });
              }
            }}
          />

          {birthdayFilter && (
            <button
              type="button"
              className="birthday-clear-btn"
              onClick={() => {
                setBirthdayFilter("");
                setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("birthday"); return next; });
              }}
            >
              ✕ Clear Birthday
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ background: stat.bgColor, color: stat.textColor }}>
                <stat.icon />
              </div>
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{formatCount(stat.value)}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredUsers.length ? (
          <>
            {/* Table with horizontal scroll */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Profile</th>
                    <th style={{ width: '120px' }}>Name</th>
                    <th style={{ width: '120px' }}>Username</th>
                    <th style={{ width: '120px' }}>Phone</th>
                    <th style={{ width: '120px' }}>Village</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Followers</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Blue Tick</th>
                    <th style={{ width: '130px' }}>Created</th>
                    <th style={{ minWidth: '460px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td style={{ textAlign: 'center' }}>{start + index}</td>
                      <td style={{ textAlign: 'center' }}>
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt={user.name} />
                        ) : (
                          <div className="profile-placeholder">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                      </td>
                      <td>{user.name || "Unnamed user"}</td>
                      <td>@{user.username || "unknown"}</td>
                      <td>{user.mobile || "N/A"}</td>
                      <td>{user.villageName || "N/A"}</td>
                      <td style={{ textAlign: 'center' }}>{formatCount(user.followers)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {user.accountStatus === "hidden" ? (
                          <MdVisibilityOff style={{ color: 'var(--warning)' }} />
                        ) : user.accountStatus === "suspended" ? (
                          <MdBlock style={{ color: 'var(--danger)' }} />
                        ) : (
                          <MdVisibility style={{ color: 'var(--brand-2)' }} />
                        )}
                        <span style={{ marginLeft: 6 }}>{user.accountStatus}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{user.blueTickStatus}</td>
                      <td style={{ fontSize: '12px' }}>{user.createdAt ? formatDate(user.createdAt) : "N/A"}</td>
                      <td>
                        <div className="action-row">
                          <AdminIconButton
                            icon={<FiEye />}
                            label="View"
                            onClick={() => openUserDetails(user)}
                            tone="primary"
                            className="icon-btn"
                          />
                          <AdminIconButton
                            icon={<FiEdit2 />}
                            label="Edit"
                            onClick={() => {
                              setEditingUser({ ...user });
                              setEditingUserOriginal({ ...user });
                            }}
                            tone="primary"
                            className="icon-btn"
                          />
                          <button
                            type="button"
                            className={`btn-sm ${user.accountStatus === "active" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => openConfirmAction(user, "status", "active")}
                            disabled={actionId === `${user.id}-status-active` || user.accountStatus === "active"}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            className={`btn-sm ${user.accountStatus === "hidden" ? "btn-warning" : "btn-secondary"}`}
                            onClick={() => openConfirmAction(user, "status", "hidden")}
                            disabled={actionId === `${user.id}-status-hidden` || user.accountStatus === "hidden"}
                          >
                            Hidden
                          </button>
                          <button
                            type="button"
                            className={`btn-sm ${user.accountStatus === "suspended" ? "btn-danger" : "btn-secondary"}`}
                            onClick={() => openConfirmAction(user, "status", "suspended")}
                            disabled={actionId === `${user.id}-status-suspended` || user.accountStatus === "suspended"}
                          >
                            Suspended
                          </button>
                          <AdminIconButton
                            icon={<FiTrash2 />}
                            label="Delete"
                            onClick={() => handleDelete(user)}
                            tone="danger"
                            className="icon-btn"
                          />
                          <button
                            type="button"
                            className="btn-sm btn-secondary"
                            onClick={() => openConfirmAction(user, "blueTick", user.blueTickStatus === "verified" ? "none" : "verified")}
                            disabled={actionId === `${user.id}-blue-tick`}
                          >
                            {user.blueTickStatus === "verified" ? "Remove Blue Tick" : "Grant Blue Tick"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="info">
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, filteredUsers.length)} of {filteredUsers.length}
              </div>
              <div className="controls">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </button>
                <span className="page-badge">
                  {page} / {pageCount}
                </span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No users found"
            message={
              birthdayFilter
                ? "No users found for the selected birthday."
                : "Try changing the filters or search term."
            }
          />
        )}
      </SectionCard>

      {/* User Details Modal */}
      <AdminModal
        open={Boolean(selectedUser)}
        title="User Details"
        subtitle="Database-backed user profile and moderation summary"
        size="xl"
        onClose={() => {
          setSelectedUser(null);
          setSelectedUserLoading(false);
        }}
      >
        {selectedUserLoading && !selectedUser ? (
          <SkeletonCard />
        ) : selectedUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Profile Photo: {selectedUser.profileImageUrl ? "Available" : "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Name: {selectedUser.name || "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Username: @{selectedUser.username || "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Email: {selectedUser.email || "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Phone: {selectedUser.mobile || "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Village: {selectedUser.villageName || "N/A"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Blue Tick: {selectedUser.blueTickStatus}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Status: {selectedUser.accountStatus}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Text Post: {selectedUser.canCreateTextPost !== false ? "Enabled" : "Disabled"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Poll Post: {selectedUser.canCreatePollPost !== false ? "Enabled" : "Disabled"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Image Post: {selectedUser.canCreateImagePost ? "Enabled" : "Disabled"}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Image + Text Post: {selectedUser.canCreateImageTextPost ? "Enabled" : "Disabled"}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Followers: {formatCount(selectedUser.followers)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Following: {formatCount(selectedUser.following)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Posts: {formatCount(selectedUser.posts)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Comments: {formatCount(selectedUser.comments)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Agrees: {formatCount(selectedUser.agreeCount)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Disagrees: {formatCount(selectedUser.disagreeCount)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Shares: {formatCount(selectedUser.shares)}</div>
              <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px' }}>Search Visibility: {selectedUser.searchVisibility ? "Visible" : "Hidden"}</div>
            </div>
            {selectedUser.bio ? <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selectedUser.bio}</p> : null}
          </div>
        ) : null}
      </AdminModal>

      {/* Edit User Modal */}
      <AdminModal
        open={Boolean(editingUser)}
        title="Edit User"
        subtitle="Update profile data and account moderation state"
        size="lg"
        onClose={() => {
          if (saving) return;
          setEditingUser(null);
          setEditingUserOriginal(null);
        }}
        actions={
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setEditingUser(null);
                setEditingUserOriginal(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" form="admin-user-form" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        {editingUser ? (
          <form id="admin-user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} onSubmit={handleSaveEdit}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Name</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.name || ""} onChange={(event) => setEditingUser((value) => ({ ...value, name: event.target.value }))} placeholder="Name" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Username</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.username || ""} onChange={(event) => setEditingUser((value) => ({ ...value, username: event.target.value }))} placeholder="Username" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Email</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.email || ""} onChange={(event) => setEditingUser((value) => ({ ...value, email: event.target.value }))} placeholder="Email" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Phone</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.mobile || ""} onChange={(event) => setEditingUser((value) => ({ ...value, mobile: event.target.value }))} placeholder="Phone" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Village ID</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.villageId || ""} onChange={(event) => setEditingUser((value) => ({ ...value, villageId: event.target.value }))} placeholder="Village ID" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Followers Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.followers ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, followers: Number(event.target.value) }))} placeholder="Followers count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Following Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.following ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, following: Number(event.target.value) }))} placeholder="Following count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Posts Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.posts ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, posts: Number(event.target.value) }))} placeholder="Posts count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Comments Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.comments ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, comments: Number(event.target.value) }))} placeholder="Comments count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Agree Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.agreeCount ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, agreeCount: Number(event.target.value) }))} placeholder="Agree count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Disagree Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.disagreeCount ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, disagreeCount: Number(event.target.value) }))} placeholder="Disagree count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Shares Count</span>
              <input style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} type="number" min="0" value={editingUser.shares ?? 0} onChange={(event) => setEditingUser((value) => ({ ...value, shares: Number(event.target.value) }))} placeholder="Shares count" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Text Post</span>
              <select style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'var(--bg)' }} disabled>
                <option value="1">Always Enabled</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Poll Post</span>
              <select style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'var(--bg)' }} disabled>
                <option value="1">Always Enabled</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Image Post</span>
              <select
                style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                value={editingUser.canCreateImagePost ? "1" : "0"}
                onChange={(event) => setEditingUser((value) => ({ ...value, canCreateImagePost: event.target.value === "1" }))}
              >
                <option value="0">Disabled</option>
                <option value="1">Enabled</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Image + Text Post</span>
              <select
                style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                value={editingUser.canCreateImageTextPost ? "1" : "0"}
                onChange={(event) => setEditingUser((value) => ({ ...value, canCreateImageTextPost: event.target.value === "1" }))}
              >
                <option value="0">Disabled</option>
                <option value="1">Enabled</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Blue Tick Status</span>
              <select style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.blueTickStatus || "none"} onChange={(event) => setEditingUser((value) => ({ ...value, blueTickStatus: event.target.value }))}>
                <option value="none">No blue tick</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Account Status</span>
              <select style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none' }} value={editingUser.accountStatus || "active"} onChange={(event) => setEditingUser((value) => ({ ...value, accountStatus: event.target.value }))}>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <div style={{ gridColumn: "1 / -1", padding: '8px 12px', background: 'rgba(var(--warning-rgb, 234, 179, 8), 0.15)', borderRadius: '8px', fontSize: '13px', color: 'var(--warning)' }}>
              💡 Active: normal account, Hidden: login allowed but profile and posts stay out of public view, Suspended: login blocked and session access revoked.
            </div>
            <label style={{ gridColumn: "1 / -1", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Search visibility</span>
              <input
                type="checkbox"
                checked={Boolean(editingUser.searchVisibility)}
                onChange={(event) => setEditingUser((value) => ({ ...value, searchVisibility: event.target.checked ? 1 : 0 }))}
              />
            </label>
            <label style={{ gridColumn: "1 / -1", display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Bio</span>
              <textarea style={{ padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '8px', fontSize: '14px', outline: 'none', minHeight: '80px', resize: 'vertical' }} value={editingUser.bio || ""} onChange={(event) => setEditingUser((value) => ({ ...value, bio: event.target.value }))} placeholder="Bio" />
            </label>
          </form>
        ) : null}
      </AdminModal>

      {/* Confirmation Modals */}
      <AdminConfirmationModal
        open={Boolean(confirmDeleteUser)}
        title={confirmDeleteUser ? `Delete user ${confirmDeleteUser.name || confirmDeleteUser.username}?` : "Delete user?"}
        message="This user account will be soft deleted from active records."
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        loading={actionId === `${confirmDeleteUser?.id}-delete`}
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setConfirmDeleteUser(null)}
      />

      <AdminConfirmationModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        loading={Boolean(confirmAction) && actionId === `${confirmAction?.user?.id}-${confirmAction?.type === "status" ? `status-${confirmAction?.nextStatus}` : "blue-tick"}`}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}