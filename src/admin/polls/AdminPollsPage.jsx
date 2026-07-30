import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  FiCalendar, FiCheckCircle, FiClock, FiEye, FiEyeOff, 
  FiFileText, FiFilter, FiLock, FiSearch, FiStar, FiTrash2, 
  FiUsers, FiXCircle, FiMoreVertical, FiEdit2, FiBarChart2,
  FiAlertCircle, FiTrendingUp, FiPieChart, FiRefreshCw
} from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import AdminModal from "../components/AdminModal";
import AdminConfirmationModal from "../components/AdminConfirmationModal";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";
import { asArray } from "../utils/adminData";
import "./AdminPollsPage.css";

const PAGE_SIZE = 10;

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

export default function AdminPollsPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [editingPoll, setEditingPoll] = useState(null);
  const [resultsEditor, setResultsEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetVotesTarget, setResetVotesTarget] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    document.title = "ConnectNKT Admin | Polls";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const buildApiPath = () => {
    const parts = [];
    if (debouncedQuery) parts.push(`q=${encodeURIComponent(debouncedQuery)}`);
    if (statusFilter && statusFilter !== "all") parts.push(`status=${encodeURIComponent(statusFilter)}`);
    if (sortBy) parts.push(`sort=${encodeURIComponent(sortBy)}`);
    return parts.length ? `/api/admin/polls?${parts.join("&")}` : "/api/admin/polls";
  };

  const { data: pollsData = [], loading, refetch } = useApiResource(buildApiPath(), { initialData: [], transform: (value) => asArray(value) });
  const { data: statsData = {} } = useApiResource("/api/admin/polls/stats", { initialData: {}, transform: (value) => value || {} });
  const { data: villages = [] } = useApiResource("/api/admin/villages", { initialData: [], transform: (value) => asArray(value) });

  const polls = useMemo(() => asArray(pollsData), [pollsData]);
  const pageCount = Math.max(1, Math.ceil(polls.length / PAGE_SIZE));
  const pagedPolls = polls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [debouncedQuery, statusFilter, sortBy]);

  async function mutatePoll(poll, action, request, successMessage) {
    setActionId(`${poll.id}-${action}`);
    try {
      await request();
      showToast?.({ type: "success", title: "Success", message: successMessage });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: error?.response?.data?.message || error.message || "Action failed." });
    } finally {
      setActionId(null);
    }
  }

  async function handleToggleVisibility(poll) {
    const action = poll.isHidden ? "restore" : "hide";
    await mutatePoll(poll, action, () => api.patch(`/api/admin/polls/${poll.id}/${action}`), `Poll ${action === "hide" ? "hidden" : "restored"}.`);
  }

  async function handleToggleStatus(poll) {
    const action = poll.status === "closed" ? "open" : "close";
    await mutatePoll(poll, action, () => api.post(`/api/admin/polls/${poll.id}/${action}`), `Poll ${action === "open" ? "opened" : "closed"}.`);
  }

  async function handleToggleFeature(poll) {
    const action = poll.isFeatured ? "unfeature" : "feature";
    await mutatePoll(poll, action, () => api.post(`/api/admin/polls/${poll.id}/${action}`), `Poll ${action === "feature" ? "featured" : "unfeatured"}.`);
  }

  async function handleToggleLock(poll) {
    const action = poll.isLocked ? "unlock" : "lock";
    await mutatePoll(poll, action, () => api.post(`/api/admin/polls/${poll.id}/${action}`), `Poll ${action === "lock" ? "locked" : "unlocked"}.`);
  }

  async function handleTogglePin(poll) {
    const action = poll.isPinned ? "unpin" : "pin";
    await mutatePoll(poll, action, () => api.post(`/api/admin/polls/${poll.id}/${action}`), `Poll ${action === "pin" ? "pinned" : "unpinned"}.`);
  }

  async function handleSoftDelete(poll) {
    await mutatePoll(poll, "delete", () => api.delete(`/api/admin/polls/${poll.id}`), "Poll deleted successfully.");
    setConfirmDelete(null);
  }

  async function handleResetVotes(poll) {
    await mutatePoll(poll, "reset-votes", () => api.post(`/api/admin/polls/${poll.id}/reset-votes`), "Poll votes reset.");
    setResetVotesTarget(null);
  }

  async function handleOpenDetails(poll) {
    try {
      const response = await api.get(`/api/admin/polls/${poll.id}`);
      setSelectedPoll(response?.data?.data ?? response?.data ?? {});
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: error?.response?.data?.message || error.message || "Unable to load poll details." });
    }
  }

  async function openResultsEditor(poll) {
    try {
      const response = await api.get(`/api/admin/polls/${poll.id}`);
      const detail = response?.data?.data ?? response?.data ?? {};
      const normalizedOptions = Array.isArray(detail?.options) ? detail.options.map((option, index) => ({
        id: option?.id ?? 0,
        text: option?.optionText || option?.text || option?.option_text || "",
        votesCount: option?.votesCount ?? option?.votes ?? option?.votes_count ?? 0,
        sortOrder: option?.sortOrder ?? option?.sort_order ?? index,
        isActive: option?.isActive ?? option?.is_active ?? 1,
      })) : [];

      setSelectedPoll(detail);
      setResultsEditor({
        poll: { ...poll },
        displayMode: detail?.displayMode || "automatic",
        options: normalizedOptions,
      });
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: error?.response?.data?.message || error.message || "Unable to load poll results." });
    }
  }

  async function saveResultsEditor(event) {
    event.preventDefault();
    if (!resultsEditor?.poll?.id) return;
    setSavingResults(true);
    try {
      const payload = {
        display_mode: resultsEditor.displayMode || "automatic",
        options: resultsEditor.options.map((option) => ({
          id: option.id || 0,
          text: option.text || "",
          votesCount: Math.max(0, Number(option.votesCount || 0)),
          sortOrder: Number(option.sortOrder || 0),
          isActive: Number(option.isActive ?? 1),
        })),
      };
      const activeOptions = payload.options.filter((option) => option.isActive === 1 && option.text.trim());
      if (activeOptions.length < 2) throw new Error("A poll must have at least two active options.");
      const labels = new Set();
      activeOptions.forEach((option) => {
        const label = option.text.trim().toLowerCase();
        if (labels.has(label)) throw new Error("Poll options must be unique.");
        labels.add(label);
      });
      await api.post(`/api/admin/polls/${resultsEditor.poll.id}/results`, payload);
      showToast?.({ type: "success", title: "Updated", message: "Poll results updated successfully." });
      setResultsEditor(null);
      refetch();
      if (selectedPoll?.id === resultsEditor.poll.id) {
        await handleOpenDetails(resultsEditor.poll);
      }
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: error?.response?.data?.message || error.message || "Could not update poll results." });
    } finally {
      setSavingResults(false);
    }
  }

  function moveResultOption(index, direction) {
    setResultsEditor((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.options.length) return current;
      const options = [...current.options];
      [options[index], options[nextIndex]] = [options[nextIndex], options[index]];
      return { ...current, options: options.map((option, optionIndex) => ({ ...option, sortOrder: optionIndex })) };
    });
  }

  function removeResultOption(index) {
    setResultsEditor((current) => current ? {
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? { ...option, removed: true, isActive: 0 } : option),
    } : current);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingPoll) return;
    setSaving(true);
    try {
      const payload = {
        question: editingPoll.question || "",
        description: editingPoll.description || "",
        status: editingPoll.status || "active",
        expires_at: editingPoll.expiryDate || null,
      };
      await api.put(`/api/admin/polls/${editingPoll.id}`, payload);
      showToast?.({ type: "success", title: "Updated", message: "Poll updated successfully." });
      setEditingPoll(null);
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Error", message: error?.response?.data?.message || error.message || "Could not update poll." });
    } finally {
      setSaving(false);
    }
  }

  const getStatusBadge = (status, isHidden) => {
    if (isHidden) return { label: "Hidden", className: "badge-hidden", icon: FiEyeOff };
    switch(status) {
      case "closed": return { label: "Closed", className: "badge-closed", icon: FiClock };
      case "reported": return { label: "Reported", className: "badge-reported", icon: FiAlertCircle };
      case "deleted": return { label: "Deleted", className: "badge-deleted", icon: FiXCircle };
      default: return { label: "Active", className: "badge-active", icon: FiCheckCircle };
    }
  };

  const getVotePercentage = (poll) => {
    const total = poll.totalVotes || 0;
    if (total === 0) return 0;
    return Math.min(100, Math.round((poll.votes || 0) / total * 100));
  };

  return (
    <div className="admin-polls-container">
      <PageHeader 
        title="Poll Management" 
        subtitle="Monitor and manage community polls from a single dashboard"
        actions={
          <button className="btn-refresh" onClick={refetch}>
            <FiRefreshCw />
            Refresh
          </button>
        }
      />

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card-total">
          <div className="stat-icon-wrapper">
            <FiFileText className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Polls</span>
            <span className="stat-value">{formatCount(statsData.totalPolls ?? polls.length)}</span>
          </div>
        </div>
        
        <div className="stat-card stat-card-active">
          <div className="stat-icon-wrapper">
            <FiCheckCircle className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active</span>
            <span className="stat-value">{formatCount(statsData.activePolls ?? 0)}</span>
          </div>
        </div>
        
        <div className="stat-card stat-card-closed">
          <div className="stat-icon-wrapper">
            <FiClock className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Closed</span>
            <span className="stat-value">{formatCount(statsData.closedPolls ?? 0)}</span>
          </div>
        </div>
        
        <div className="stat-card stat-card-votes">
          <div className="stat-icon-wrapper">
            <FiUsers className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Votes</span>
            <span className="stat-value">{formatCount(statsData.totalVotes ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input 
            value={query} 
            onChange={(event) => setQuery(event.target.value)} 
            placeholder="Search polls by title or creator..." 
            className="search-input"
          />
        </div>
        
        <div className="filters-group">
          <select 
            value={statusFilter} 
            onChange={(event) => setStatusFilter(event.target.value)} 
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="hidden">Hidden</option>
            <option value="reported">Reported</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(event) => setSortBy(event.target.value)} 
            className="filter-select"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="votes">Most Votes</option>
            <option value="reports">Most Reported</option>
          </select>
        </div>
      </div>

      {/* Polls Table */}
      {loading ? (
        <div className="loading-grid">
          {[...Array(4)].map((_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState title="No polls found" message="No poll content is available for management yet." />
      ) : (
        <div className="table-container">
          <table className="polls-table">
            <thead>
              <tr>
                <th>Poll</th>
                <th>Creator</th>
                <th>Votes</th>
                <th>Status</th>
                <th>Reports</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedPolls.map((poll) => {
                const statusBadge = getStatusBadge(poll.status, poll.isHidden);
                const StatusIcon = statusBadge.icon;
                const isExpanded = expandedRow === poll.id;

                return (
                  <tr key={poll.id} className="poll-row">
                    <td className="poll-info-cell">
                      <div className="poll-question">{poll.question || "Untitled poll"}</div>
                      <div className="poll-meta">
                        <span className="meta-item">
                          <FiCalendar size={12} />
                          {poll.createdAt ? formatDate(poll.createdAt) : "N/A"}
                        </span>
                        <span className="meta-item">
                          <FiUsers size={12} />
                          {poll.village || "No village"}
                        </span>
                        <span className="meta-item">
                          <FiBarChart2 size={12} />
                          {poll.optionsCount || 0} options
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="creator-info">
                        <div className="creator-avatar">
                          {(poll.creator?.username || poll.creator?.name || "U")[0].toUpperCase()}
                        </div>
                        <span className="creator-name">
                          {poll.creator?.username || poll.creator?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="votes-display">
                        <span className="votes-count">{formatCount(poll.totalVotes || 0)}</span>
                        <div className="votes-bar">
                          <div 
                            className="votes-bar-fill" 
                            style={{ width: `${Math.min(100, getVotePercentage(poll))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusBadge.className}`}>
                        <StatusIcon size={14} />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td>
                      {poll.reports > 0 ? (
                        <span className="reports-badge">
                          <FiAlertCircle size={14} />
                          {formatCount(poll.reports || 0)}
                        </span>
                      ) : (
                        <span className="reports-none">None</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button 
                          className="action-btn action-view" 
                          onClick={() => handleOpenDetails(poll)}
                          title="View Details"
                        >
                          <FiEye size={16} />
                        </button>
                        <button 
                          className="action-btn action-results" 
                          onClick={() => openResultsEditor(poll)}
                          title="Manage Results"
                        >
                          <FiPieChart size={16} />
                        </button>
                        <button 
                          className="action-btn action-edit" 
                          onClick={() => setEditingPoll(poll)}
                          title="Edit Poll"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          className={`action-btn ${poll.isHidden ? 'action-restore' : 'action-hide'}`}
                          onClick={() => handleToggleVisibility(poll)}
                          title={poll.isHidden ? "Restore" : "Hide"}
                        >
                          {poll.isHidden ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                        </button>
                        <button 
                          className="action-btn action-more"
                          onClick={() => setMenuOpen(menuOpen === poll.id ? null : poll.id)}
                          title="More Actions"
                        >
                          <FiMoreVertical size={16} />
                        </button>
                      </div>

                      {menuOpen === poll.id && (
                        <div className="dropdown-menu">
                          <button onClick={() => handleToggleStatus(poll)}>
                            {poll.status === "closed" ? "Open Poll" : "Close Poll"}
                          </button>
                          <button onClick={() => handleToggleFeature(poll)}>
                            {poll.isFeatured ? "Unfeature" : "Feature"}
                          </button>
                          <button onClick={() => handleTogglePin(poll)}>
                            {poll.isPinned ? "Unpin" : "Pin"}
                          </button>
                          <button onClick={() => handleToggleLock(poll)}>
                            {poll.isLocked ? "Unlock" : "Lock"}
                          </button>
                          <button onClick={() => setResetVotesTarget(poll)}>
                            Reset Votes
                          </button>
                          <button 
                            className="dropdown-danger" 
                            onClick={() => setConfirmDelete(poll)}
                          >
                            <FiTrash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination-section">
        <div className="pagination-info">
          Showing {pagedPolls.length} of {polls.length} polls
        </div>
        <div className="pagination-controls">
          <button 
            className="pagination-btn" 
            disabled={page <= 1} 
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <span className="pagination-current">Page {page} of {pageCount}</span>
          <button 
            className="pagination-btn" 
            disabled={page >= pageCount} 
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modals remain the same but with updated styling */}
      <AdminModal open={Boolean(selectedPoll)} title="Poll Details" subtitle="Review poll details and voting activity" size="lg" onClose={() => setSelectedPoll(null)}>
        {/* Modal content remains the same */}
        {selectedPoll ? (
          <div className="modal-content">
            <div className="modal-details-grid">
              <div className="detail-field">
                <span className="detail-field-label">Question</span>
                <span className="detail-field-value">{selectedPoll.question || "N/A"}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Description</span>
                <span className="detail-field-value">{selectedPoll.description || "No description"}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Status</span>
                <span className="detail-field-value">{selectedPoll.status || "active"}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Visibility</span>
                <span className="detail-field-value">{selectedPoll.visibility || (selectedPoll.isHidden ? "hidden" : "visible")}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Total Votes</span>
                <span className="detail-field-value">{formatCount(selectedPoll.totalVotes || 0)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Reports</span>
                <span className="detail-field-value">{formatCount(selectedPoll.reports || 0)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Created</span>
                <span className="detail-field-value">{selectedPoll.createdAt ? formatDate(selectedPoll.createdAt) : "N/A"}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Expiry</span>
                <span className="detail-field-value">{selectedPoll.expiryDate ? formatDate(selectedPoll.expiryDate) : "No expiry"}</span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Options</h4>
              {(selectedPoll.options || []).length ? (
                <div className="entity-list">
                  {(selectedPoll.options || []).map((option) => (
                    <div key={option.id || option.optionText} className="entity-card" style={{ cursor: "default" }}>
                      <div className="entity-card-content">
                        <div className="entity-card-main">
                          <span className="entity-card-name">{option.optionText || option.text || "Option"}</span>
                          <span className="entity-card-sub">{formatCount(option.votesCount || option.votes || 0)} votes</span>
                        </div>
                        <div className="entity-card-meta">
                          <span className="entity-card-count">{Number(option.percentage || option.votePercentage || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No options" message="No poll options were found." />}
            </div>

            {Array.isArray(selectedPoll.voters) && selectedPoll.voters.length ? (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Recent Voters</h4>
                <div className="entity-list">
                  {selectedPoll.voters.slice(0, 8).map((voter) => (
                    <div key={voter.id} className="entity-card" style={{ cursor: "default" }}>
                      <div className="entity-card-content">
                        <div className="entity-card-main">
                          <span className="entity-card-name">{voter.user_name || voter.username || "User"}</span>
                          <span className="entity-card-sub">{voter.created_at ? formatDate(voter.created_at) : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={Boolean(resultsEditor)} title="Manage Poll Results" subtitle="Override vote counts, reorder options, and control display" size="lg" onClose={() => setResultsEditor(null)}>
        {resultsEditor ? (
          <form onSubmit={saveResultsEditor}>
            <div className="form-grid">
              <label className="form-field">
                <span>Display Mode</span>
                <select value={resultsEditor.displayMode || "automatic"} onChange={(event) => setResultsEditor((current) => ({ ...current, displayMode: event.target.value }))}>
                  <option value="automatic">Automatic by vote count</option>
                  <option value="custom">Custom admin order</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Options</h4>
              <div className="detail-field-value" style={{ marginBottom: 8 }}>
                Total votes: <strong>{formatCount(resultsEditor.options.reduce((sum, option) => sum + Math.max(0, Number(option.votesCount || 0)), 0))}</strong>
              </div>
              <div className="entity-list">
                {resultsEditor.options.map((option, index) => (
                  <div key={option.id || `${option.text}-${index}`} className="entity-card" style={{ cursor: "default" }}>
                    <div className="entity-card-content" style={{ alignItems: "center" }}>
                      <div className="entity-card-main" style={{ flex: 1 }}>
                        <input value={option.text || ""} onChange={(event) => setResultsEditor((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) }))} />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" min="0" value={option.votesCount ?? 0} onChange={(event) => setResultsEditor((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, votesCount: Math.max(0, Number(event.target.value || 0)) } : item) }))} style={{ width: 90 }} />
                        <button type="button" className="btn btn-secondary btn-sm" disabled={index === 0} onClick={() => moveResultOption(index, -1)}>Up</button>
                        <button type="button" className="btn btn-secondary btn-sm" disabled={index === resultsEditor.options.length - 1} onClick={() => moveResultOption(index, 1)}>Down</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeResultOption(index)}>Delete</button>
                        <label className="muted" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input type="checkbox" checked={option.isActive !== 0} onChange={(event) => setResultsEditor((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked ? 1 : 0 } : item) }))} />
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setResultsEditor((current) => ({ ...current, options: [...current.options, { id: 0, text: "", votesCount: 0, sortOrder: current.options.length, isActive: 1 }] }))}>Add Option</button>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setResultsEditor(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingResults}>{savingResults ? "Saving..." : "Save Results"}</button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal open={Boolean(editingPoll)} title="Edit Poll" subtitle="Modify poll details and status" size="md" onClose={() => setEditingPoll(null)}>
        {editingPoll ? (
          <form onSubmit={handleSaveEdit}>
            <div className="form-grid">
              <label className="form-field">
                <span>Question</span>
                <input value={editingPoll.question || ""} onChange={(event) => setEditingPoll((current) => ({ ...current, question: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Description</span>
                <textarea value={editingPoll.description || ""} onChange={(event) => setEditingPoll((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select value={editingPoll.status || "active"} onChange={(event) => setEditingPoll((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="form-field">
                <span>Expiry date (optional)</span>
                <input type="datetime-local" value={editingPoll.expiryDate ? String(editingPoll.expiryDate).slice(0, 16) : ""} onChange={(event) => setEditingPoll((current) => ({ ...current, expiryDate: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingPoll(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminConfirmationModal
        open={Boolean(confirmDelete)}
        title="Delete poll"
        message="This will remove the poll from the admin list and mark it as deleted. Continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => handleSoftDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />

      <AdminConfirmationModal
        open={Boolean(resetVotesTarget)}
        title="Reset poll votes"
        message="This will clear all existing vote counts for this poll. Continue?"
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onConfirm={() => handleResetVotes(resetVotesTarget)}
        onClose={() => setResetVotesTarget(null)}
      />
    </div>
  );
}
