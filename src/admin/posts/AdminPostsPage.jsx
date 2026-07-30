import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  FiDownload, FiEdit2, FiEye, FiSearch, FiTrash2, FiEyeOff, 
  FiFileText, FiEye as FiEyeVisible, FiMessageCircle, 
  FiThumbsUp, FiThumbsDown, FiShare2, FiAlertCircle, FiStar
} from "react-icons/fi";
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
import { asArray, buildCsv, downloadCsv } from "../utils/adminData";

const PAGE_SIZE = 10;

export default function AdminPostsPage() {
  const { showToast } = useOutletContext();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [page, setPage] = useState(1);
  const [villageFilter, setVillageFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(null);

  // Debounce search
  useEffect(() => {
    const term = query.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(term), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Build API URL with filters
  const buildApiPath = () => {
    const parts = [];
    if (debouncedQuery) parts.push(`q=${encodeURIComponent(debouncedQuery)}`);
    if (villageFilter) parts.push(`village=${encodeURIComponent(villageFilter)}`);
    return parts.length ? `/api/admin/posts?${parts.join('&')}` : "/api/admin/posts";
  };

  // Fetch posts
  const { data: postsData = [], loading, refetch } = useApiResource(buildApiPath(), {
    initialData: [],
    transform: (value) => asArray(value),
  });

  // Fetch villages for filter
  const { data: villages = [] } = useApiResource('/api/admin/villages', {
    initialData: [],
    transform: (value) => asArray(value)
  });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Posts";
  }, []);

  // Posts data
  const posts = useMemo(() => asArray(postsData), [postsData]);

  // Filter and sort
  const filteredPosts = useMemo(() => {
    let rows = posts.slice();
    
    // Status filter
    if (statusFilter !== "all") {
      rows = rows.filter((post) => {
        const isHidden = post.isHidden || post.is_hidden || 0;
        const visibility = post.visibility || 'visible';
        const reports = post.reports || 0;
        
        if (statusFilter === "visible") {
          return !isHidden && visibility !== 'hidden';
        }
        if (statusFilter === "hidden") {
          return isHidden || visibility === 'hidden';
        }
        if (statusFilter === "reported") {
          return reports > 0;
        }
        if (statusFilter === "globalPinned") {
          return post.isGloballyPinned || post.is_globally_pinned || 0;
        }
        if (statusFilter === "userPinned") {
          return post.isPinned || post.is_pinned || 0;
        }
        return true;
      });
    }
    
    // Sorting
    rows.sort((a, b) => {
      switch(sortBy) {
        case "createdAt-desc":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "createdAt-asc":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "agrees-desc":
          return (b.agrees || 0) - (a.agrees || 0);
        case "comments-desc":
          return (b.comments || 0) - (a.comments || 0);
        case "reports-desc":
          return (b.reports || 0) - (a.reports || 0);
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
    
    return rows;
  }, [posts, statusFilter, sortBy]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, villageFilter, statusFilter, sortBy]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const pagedPosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = filteredPosts.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  // CSV Export
  const csvRows = useMemo(
    () =>
      buildCsv(filteredPosts, [
        { label: "ID", value: "id" },
        { label: "Author", value: (row) => row.author?.name || "" },
        { label: "Username", value: (row) => row.author?.username || "" },
        { label: "Village", value: "village" },
        { label: "Content", value: (row) => row.content?.substring(0, 100) || "" },
        { label: "Category", value: "category" },
        { label: "Agrees", value: "agrees" },
        { label: "Disagrees", value: "disagrees" },
        { label: "Comments", value: "comments" },
        { label: "Shares", value: "shares" },
        { label: "Reports", value: "reports" },
        { label: "Status", value: "visibility" },
        { label: "Created", value: (row) => row.createdAt ? formatDate(row.createdAt) : "" },
      ]),
    [filteredPosts]
  );

  // API mutation helper
  async function mutatePost(id, action, request, successMessage) {
    setActionId(`${id}-${action}`);
    try {
      await request();
      showToast?.({ type: "success", title: "Success", message: successMessage });
      refetch();
    } catch (error) {
      showToast?.({ 
        type: "error", 
        title: "Error", 
        message: error?.response?.data?.message || error.message || "Action failed." 
      });
    } finally {
      setActionId(null);
    }
  }

  // Delete post
  async function handleDelete(post) {
    setConfirmDeletePost(post);
  }

  async function handleConfirmDelete() {
    if (!confirmDeletePost) return;
    await mutatePost(
      confirmDeletePost.id,
      "delete",
      () => api.delete(`/api/admin/posts/${confirmDeletePost.id}`),
      "Post deleted successfully."
    );
    setConfirmDeletePost(null);
  }

  // Toggle visibility
  async function handleToggleVisibility(post) {
    const isHidden = post.isHidden || post.is_hidden || 0;
    const action = isHidden ? 'restore' : 'hide';
    await mutatePost(
      post.id,
      action,
      () => api.patch(`/api/admin/posts/${post.id}/${action}`),
      `Post ${action === 'hide' ? 'hidden' : 'restored'} successfully.`
    );
  }

  // Update post
  async function handleUpdatePost(event) {
    event.preventDefault();
    if (!editingPost) return;
    setSaving(true);
    try {
      const payload = {
        content: editingPost.content,
        category_id: editingPost.categoryId || 0,
        agrees: editingPost.agrees || 0,
        disagrees: editingPost.disagrees || 0,
        comments: editingPost.comments || 0,
        shares: editingPost.shares || 0,
        visibility: editingPost.visibility || 'visible',
      };
      
      await api.put(`/api/admin/posts/${editingPost.id}`, payload);
      showToast?.({ type: "success", title: "Updated", message: "Post updated successfully." });
      setEditingPost(null);
      refetch();
    } catch (error) {
      showToast?.({ 
        type: "error", 
        title: "Error", 
        message: error?.response?.data?.message || error.message || "Update failed." 
      });
    } finally {
      setSaving(false);
    }
  }

  // Get preview text
  const getPreview = (content, words = 6) => {
    if (!content) return "";
    const parts = content.split(/\s+/).filter(w => w.length > 0);
    return parts.length <= words ? content : parts.slice(0, words).join(" ") + "...";
  };

  // Stats
  const stats = [
    {
      label: "Total Posts",
      value: posts.length,
      icon: FiFileText,
      bg: "#eff6ff",
      color: "#3b82f6"
    },
    {
      label: "Visible",
      value: posts.filter(p => {
        const hidden = p.isHidden || p.is_hidden || 0;
        return !hidden && p.visibility !== 'hidden';
      }).length,
      icon: FiEyeVisible,
      bg: "#dcfce7",
      color: "#22c55e"
    },
    {
      label: "Hidden",
      value: posts.filter(p => {
        const hidden = p.isHidden || p.is_hidden || 0;
        return hidden || p.visibility === 'hidden';
      }).length,
      icon: FiEyeOff,
      bg: "#fef3c7",
      color: "#f59e0b"
    },
    {
      label: "Reported",
      value: posts.filter(p => (p.reports || 0) > 0).length,
      icon: FiAlertCircle,
      bg: "#fee2e2",
      color: "#ef4444"
    },
  ];

  return (
    <div className="stack" style={{ padding: '20px' }}>
      <PageHeader 
        title="Posts" 
        subtitle="Manage posts with search, filters, and moderation actions." 
      />

      <SectionCard title="Post Management">
        {/* Search & Filter Bar */}
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '24px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <FiSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by content, username, or village..."
              style={{
                width: '100%',
                padding: '10px 16px 10px 40px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Village Filter */}
          <div style={{ minWidth: '200px' }}>
            <select
              value={villageFilter}
              onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">🏘️ All Villages</option>
              {villages.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={() => downloadCsv("posts.csv", csvRows)}
            disabled={!filteredPosts.length}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: filteredPosts.length ? 'pointer' : 'not-allowed',
              opacity: filteredPosts.length ? 1 : 0.5
            }}
          >
            <FiDownload /> Export CSV
          </button>
        </div>

        {/* Filters Row */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              padding: '8px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'white',
              minWidth: '150px'
            }}
          >
            <option value="all">👁️ All Posts</option>
            <option value="visible">✅ Visible</option>
            <option value="hidden">🚫 Hidden</option>
            <option value="reported">🚩 Reported</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'white',
              minWidth: '150px'
            }}
          >
            <option value="createdAt-desc">🕐 Newest</option>
            <option value="createdAt-asc">🕐 Oldest</option>
            <option value="agrees-desc">👍 Most Agrees</option>
            <option value="comments-desc">💬 Most Comments</option>
            <option value="reports-desc">🚩 Most Reports</option>
          </select>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: stat.bg,
                color: stat.color
              }}>
                <stat.icon size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{stat.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                  {formatCount(stat.value)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonCard />
        ) : filteredPosts.length ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', width: '50px' }}>#</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '120px' }}>Author</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Content</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '100px' }}>Village</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>👍</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>💬</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>🚩</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '80px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '300px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPosts.map((post, idx) => {
                    const isHidden = post.isHidden || post.is_hidden || 0;
                    const reports = post.reports || 0;
                    
                    return (
                      <tr key={post.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{start + idx}</td>
                        <td style={{ padding: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{post.author?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              @{post.author?.username || 'unknown'}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div title={post.content}>
                            {getPreview(post.content || '')}
                          </div>
                          {post.category && (
                            <span style={{
                              fontSize: '10px',
                              background: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              color: '#64748b'
                            }}>
                              {post.category}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>{post.village || 'N/A'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#22c55e' }}>
                          {formatCount(post.agrees)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#3b82f6' }}>
                          {formatCount(post.comments)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {reports > 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>{reports}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: !isHidden ? '#dcfce7' : '#fef3c7',
                            color: !isHidden ? '#16a34a' : '#d97706'
                          }}>
                            {!isHidden ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <AdminIconButton
                              icon={<FiEye />}
                              label="View"
                              onClick={() => setSelectedPost(post)}
                              tone="primary"
                            />
                            <AdminIconButton
                              icon={<FiEdit2 />}
                              label="Edit"
                              onClick={() => setEditingPost({ ...post })}
                              tone="primary"
                            />
                            <button
                              onClick={() => handleToggleVisibility(post)}
                              disabled={actionId === `${post.id}-hide` || actionId === `${post.id}-restore`}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: isHidden ? '#dcfce7' : '#fef3c7',
                                color: isHidden ? '#16a34a' : '#d97706',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isHidden ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                              {isHidden ? 'Show' : 'Hide'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (post.isGloballyPinned) {
                                    await api.delete(`/api/admin/posts/${post.id}/global-pin`);
                                  } else {
                                    await api.post(`/api/admin/posts/${post.id}/global-pin`);
                                  }
                                  refetch();
                                } catch (err) {
                                  showToast?.({ type: "error", title: "Error", message: err?.response?.data?.message || "Failed to update pin status" });
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: post.isGloballyPinned ? '#fff3e0' : '#e3f2fd',
                                color: post.isGloballyPinned ? '#f57c00' : '#1976d2',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <FiStar size={14} />
                              {post.isGloballyPinned ? 'Unpin Global' : 'Pin Global'}
                            </button>
                            <AdminIconButton
                              icon={<FiTrash2 />}
                              label="Delete"
                              onClick={() => handleDelete(post)}
                              tone="danger"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                Showing {start}-{Math.min(start + PAGE_SIZE - 1, filteredPosts.length)} of {filteredPosts.length}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <span style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  fontWeight: 600
                }}>
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: page >= pageCount ? 'not-allowed' : 'pointer',
                    opacity: page >= pageCount ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No posts found" message="Try adjusting your search or filters." />
        )}
      </SectionCard>

      {/* View Post Modal */}
      <AdminModal
        open={Boolean(selectedPost)}
        title="Post Details"
        size="lg"
        onClose={() => setSelectedPost(null)}
      >
        {selectedPost && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Author</div>
                <div style={{ fontWeight: 600 }}>{selectedPost.author?.name || 'N/A'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Username</div>
                <div style={{ fontWeight: 600 }}>@{selectedPost.author?.username || 'N/A'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Village</div>
                <div style={{ fontWeight: 600 }}>{selectedPost.village || 'N/A'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Status</div>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: (selectedPost.isHidden || 0) ? '#fef3c7' : '#dcfce7',
                  color: (selectedPost.isHidden || 0) ? '#d97706' : '#16a34a'
                }}>
                  {(selectedPost.isHidden || 0) ? 'Hidden' : 'Visible'}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#16a34a' }}>👍 Agrees</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>
                  {formatCount(selectedPost.agrees)}
                </div>
              </div>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>👎 Disagrees</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>
                  {formatCount(selectedPost.disagrees)}
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>💬 Comments</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>
                  {formatCount(selectedPost.comments)}
                </div>
              </div>
              <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#8b5cf6' }}>🔗 Shares</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>
                  {formatCount(selectedPost.shares)}
                </div>
              </div>
              <div style={{ background: '#fefce8', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#d97706' }}>🚩 Reports</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#d97706' }}>
                  {formatCount(selectedPost.reports)}
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Content</div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {selectedPost.content || 'No content'}
              </p>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Edit Post Modal */}
      <AdminModal
        open={Boolean(editingPost)}
        title="Edit Post"
        size="lg"
        onClose={() => !saving && setEditingPost(null)}
        actions={
          <>
            <button
              onClick={() => setEditingPost(null)}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                background: 'white',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-post-form"
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editingPost && (
          <form id="edit-post-form" onSubmit={handleUpdatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Content
              </label>
              <textarea
                value={editingPost.content || ''}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <input
                  value={editingPost.category || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Visibility
                </label>
                <select
                  value={editingPost.visibility || 'visible'}
                  onChange={(e) => setEditingPost({ ...editingPost, visibility: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}
                >
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  👍 Agrees
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingPost.agrees || 0}
                  onChange={(e) => setEditingPost({ ...editingPost, agrees: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  👎 Disagrees
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingPost.disagrees || 0}
                  onChange={(e) => setEditingPost({ ...editingPost, disagrees: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  💬 Comments
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingPost.comments || 0}
                  onChange={(e) => setEditingPost({ ...editingPost, comments: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  🔗 Shares
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingPost.shares || 0}
                  onChange={(e) => setEditingPost({ ...editingPost, shares: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  🚩 Reports
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingPost.reports || 0}
                  onChange={(e) => setEditingPost({ ...editingPost, reports: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
            </div>
          </form>
        )}
      </AdminModal>

      {/* Delete Confirmation */}
      <AdminConfirmationModal
        open={Boolean(confirmDeletePost)}
        title={`Delete post #${confirmDeletePost?.id || ''}?`}
        message="This action cannot be undone. The post will be permanently deleted."
        confirmLabel="Delete"
        loading={actionId === `${confirmDeletePost?.id}-delete`}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeletePost(null)}
      />
    </div>
  );
}