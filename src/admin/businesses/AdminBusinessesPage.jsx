import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiEdit2, FiEye, FiFilter, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import AdminModal from "../components/AdminModal";

const tabOptions = ["businesses", "categories"];
const statusOptions = ["all", "pending", "approved", "rejected", "suspended"];

export default function AdminBusinessesPage() {
  const { showToast } = useOutletContext();
  const [activeTab, setActiveTab] = useState("businesses");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryForm, setCategoryForm] = useState({ id: null, name: "", slug: "", sort_order: 0, is_active: 1, icon: "", image: "", description: "" });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [modalState, setModalState] = useState({ open: false, type: null, business: null, remark: "", loading: false, editForm: {} });
  const [followerState, setFollowerState] = useState({ business: null, rows: [], count: "", loading: false });

  const { data: businesses = [], refetch: refetchBusinesses } = useApiResource("/api/admin/businesses", { initialData: [] });
  const { data: categories = [], refetch: refetchCategories } = useApiResource("/api/admin/business-categories", { initialData: [] });
  const { data: villages = [] } = useApiResource("/api/villages", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Business Directory";
  }, []);

  const counts = useMemo(() => {
    const rows = Array.isArray(businesses) ? businesses : [];
    return {
      all: rows.length,
      approved: rows.filter((item) => item.status === "approved").length,
      pending: rows.filter((item) => item.status === "pending").length,
      rejected: rows.filter((item) => item.status === "rejected").length,
      suspended: rows.filter((item) => item.status === "suspended").length,
    };
  }, [businesses]);

  const displayedBusinesses = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (Array.isArray(businesses) ? businesses : []).filter((business) => {
      const matchesSearch = !keyword || [business.business_name, business.owner_name, business.category_name, business.village_name, business.address].filter(Boolean).join(" ").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || business.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [businesses, query, statusFilter]);

  function closeModal() {
    setModalState({ open: false, type: null, business: null, remark: "", loading: false, editForm: {} });
  }

  function openViewModal(business) {
    setModalState({ open: true, type: "view", business, remark: "", loading: false, editForm: {} });
  }

  function openEditModal(business) {
    setModalState({
      open: true,
      type: "edit",
      business,
      remark: "",
      loading: false,
      editForm: {
        logo_url: business.logo_url || business.logo || "",
        business_name: business.business_name || "",
        owner_name: business.owner_name || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        website: business.website || "",
        whatsapp: business.whatsapp || "",
        facebook: business.facebook || "",
        instagram: business.instagram || "",
        youtube: business.youtube || "",
        opening_time: business.opening_time || "",
        closing_time: business.closing_time || "",
        days_open: Array.isArray(business.days_open) ? business.days_open : String(business.days_open || "").split(",").map((value) => value.trim()).filter(Boolean),
        tagline: business.tagline || "",
        established_year: business.established_year || "",
        business_license: business.business_license || "",
        gst_number: business.gst_number || "",
        offers: business.offers || "",
        services: business.services || "",
        description: business.description || "",
        category_id: business.category_id ? String(business.category_id) : "",
        village_id: business.village_id ? String(business.village_id) : "",
      },
    });
  }

  function openActionModal(business, type) {
    setModalState({ open: true, type, business, remark: "", loading: false, editForm: {} });
  }

  async function openFollowersModal(business) {
    setFollowerState({ business, rows: [], count: business.followers_count || 0, loading: true });
    try {
      const response = await api.get(`/api/admin/business/${business.id}/followers`, { params: { limit: 50 } });
      setFollowerState((current) => ({ ...current, rows: response?.data?.data?.followers || [], loading: false }));
    } catch (error) {
      setFollowerState((current) => ({ ...current, loading: false }));
      showToast?.({ type: "error", title: "Followers failed", message: error?.response?.data?.message || "Unable to load followers." });
    }
  }

  async function updateFollowers(action, payload = {}) {
    if (!followerState.business) return;
    try {
      await api.post(`/api/admin/business/${followerState.business.id}/followers`, { action, ...payload });
      showToast?.({ type: "success", title: "Followers updated", message: "Follower count and verification status were synchronized." });
      setFollowerState({ business: null, rows: [], count: "", loading: false });
      refetchBusinesses();
    } catch (error) {
      showToast?.({ type: "error", title: "Update failed", message: error?.response?.data?.message || "Unable to update followers." });
    }
  }

  async function handleModalConfirm() {
    const { type, business, remark, editForm } = modalState;
    if (!business) return;

    setModalState((current) => ({ ...current, loading: true }));

      try {
      if (type === "edit") {
        await api.put(`/api/business/update/${business.id}`, {
          ...editForm,
          category_id: Number(editForm.category_id || 0),
          village_id: Number(editForm.village_id || 0),
          logo_url: editForm.logo_url || business.logo_url || business.logo || "",
        });
        showToast?.({ type: "success", title: "Business updated", message: "The business information was updated successfully." });
      } else if (type === "delete") {
        await api.delete(`/api/business/delete/${business.id}`);
        showToast?.({ type: "success", title: "Business deleted", message: "The business was deleted successfully." });
      } else if (type === "reject") {
        await api.post("/api/admin/business/reject", { id: business.id, admin_remark: remark });
        showToast?.({ type: "success", title: "Business rejected", message: "The business was rejected successfully." });
      } else if (type === "approve") {
        await api.post("/api/admin/business/approve", { id: business.id });
        showToast?.({ type: "success", title: "Business approved", message: "The business was approved successfully." });
      } else if (type === "suspend") {
        await api.post("/api/admin/business/suspend", { id: business.id });
        showToast?.({ type: "success", title: "Business suspended", message: "The business was suspended successfully." });
      } else if (type === "restore") {
        await api.post("/api/admin/business/restore", { id: business.id });
        showToast?.({ type: "success", title: "Business restored", message: "The business was restored successfully." });
      } else if (type === "verify") {
        await api.post("/api/admin/business/verify", { id: business.id });
        showToast?.({ type: "success", title: "Business verified", message: "The business was verified successfully." });
      } else if (type === "revoke") {
        await api.post("/api/admin/business/revoke", { id: business.id });
        showToast?.({ type: "success", title: "Verification revoked", message: "The business verification was revoked." });
      }

      refetchBusinesses();
      closeModal();
    } catch (error) {
      showToast?.({ type: "error", title: "Action failed", message: error?.response?.data?.message || "Unable to complete this action." });
      setModalState((current) => ({ ...current, loading: false }));
    }
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    try {
      if (editingCategoryId) {
        await api.put(`/api/admin/business-categories/${editingCategoryId}`, categoryForm);
      } else {
        await api.post("/api/admin/business-categories", categoryForm);
      }
      showToast?.({ type: "success", title: "Category saved", message: "The category was saved successfully." });
      setCategoryForm({ id: null, name: "", slug: "", sort_order: 0, is_active: 1, icon: "", image: "", description: "" });
      setEditingCategoryId(null);
      refetchCategories();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || "Unable to save category." });
    }
  }

  async function handleCategoryDelete(id) {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/api/admin/business-categories/${id}`);
      refetchCategories();
    } catch (error) {
      showToast?.({ type: "error", title: "Delete failed", message: error?.response?.data?.message || "Unable to delete category." });
    }
  }

  function startEditCategory(item) {
    setEditingCategoryId(item.id);
    setCategoryForm({
      id: item.id,
      name: item.name || "",
      slug: item.slug || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active ? 1 : 0,
      icon: item.icon || "",
      image: item.image || "",
      description: item.description || "",
    });
    setActiveTab("categories");
  }

  return (
    <div className="stack responsive-admin-page">
      <PageHeader title="Business Directory" subtitle="Manage businesses and the category list for the directory." />
      <div className="admin-summary-row">
        <div className="summary-card summary-card-primary"><span>All businesses</span><strong>{counts.all}</strong></div>
        <div className="summary-card summary-card-success"><span>Approved</span><strong>{counts.approved}</strong></div>
        <div className="summary-card summary-card-warning"><span>Pending</span><strong>{counts.pending}</strong></div>
        <div className="summary-card summary-card-danger"><span>Rejected</span><strong>{counts.rejected}</strong></div>
        <div className="summary-card summary-card-muted"><span>Suspended</span><strong>{counts.suspended}</strong></div>
      </div>
      <div className="tab-row">
        {tabOptions.map((tab) => (
          <button type="button" key={tab} className={`btn ${activeTab === tab ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab(tab)}>{tab === "businesses" ? "Businesses" : "Categories"}</button>
        ))}
      </div>

      {activeTab === "businesses" ? (
        <SectionCard title="Businesses">
          <div className="business-filter-bar">
            <div className="filter-item search-filter">
              <FiSearch />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search businesses, owner, category..." />
            </div>
            <div className="filter-item">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status === "all" ? "All statuses" : status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Owner</th>
                  <th>Category</th>
                  <th>Followers</th>
                  <th>Views</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedBusinesses.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.business_name}</strong><div className="muted">{item.village_name || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</div></td>
                    <td>{item.owner_name || item.owner_display_name || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</td>
                    <td>{item.category_name || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</td>
                    <td>{Number(item.followers_count || 0).toLocaleString()}</td>
                    <td>{Number(item.views_count || 0).toLocaleString()}</td>
                    <td>{item.is_verified ? "Blue tick" : "Not verified"}</td>
                    <td><span className={`status-pill small ${String(item.status || "pending").toLowerCase()}`}>{String(item.status || "pending")}</span></td>
                    <td>
                      <div className="action-stack">
                        <button className="btn btn-secondary btn-sm" onClick={() => openViewModal(item)}><FiEye /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openFollowersModal(item)} title="Manage followers">Followers</button>

                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}><FiEdit2 /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => openActionModal(item, "suspend")}>Suspend</button>
                        <button className="btn btn-primary btn-sm" onClick={() => openActionModal(item, "approve")}>Approve</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openActionModal(item, "reject")}>Reject</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openActionModal(item, "restore")}>Restore</button>
                        <button className="btn btn-danger btn-sm" onClick={() => openActionModal(item, "delete")}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Categories">
          <form className="admin-form-grid" onSubmit={handleCategorySubmit}>
            <input className="field" value={categoryForm.name} onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))} placeholder="Category name" />
            <input className="field" value={categoryForm.slug} onChange={(e) => setCategoryForm((current) => ({ ...current, slug: e.target.value }))} placeholder="Slug" />
            <input className="field" type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((current) => ({ ...current, sort_order: Number(e.target.value) }))} placeholder="Sort order" />
            <select className="field" value={categoryForm.is_active} onChange={(e) => setCategoryForm((current) => ({ ...current, is_active: Number(e.target.value) }))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
            <input className="field" value={categoryForm.icon} onChange={(e) => setCategoryForm((current) => ({ ...current, icon: e.target.value }))} placeholder="Icon" />
            <input className="field" value={categoryForm.image} onChange={(e) => setCategoryForm((current) => ({ ...current, image: e.target.value }))} placeholder="Image URL" />
            <textarea className="field" value={categoryForm.description} onChange={(e) => setCategoryForm((current) => ({ ...current, description: e.target.value }))} placeholder="Description" style={{ gridColumn: "1 / -1" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary"><FiPlus /> {editingCategoryId ? "Update" : "Create"}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingCategoryId(null); setCategoryForm({ id: null, name: "", slug: "", sort_order: 0, is_active: 1, icon: "", image: "", description: "" }); }}>Reset</button>
            </div>
          </form>
          <div className="admin-table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(categories) ? categories : []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.slug}</td>
                    <td>{item.is_active ? "Active" : "Inactive"}</td>
                    <td>{item.sort_order}</td>
                    <td>
                      <div className="action-stack">
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditCategory(item)}><FiEdit2 /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleCategoryDelete(item.id)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {modalState.open && modalState.type === "view" && modalState.business ? (
        <AdminModal open={modalState.open} title={modalState.business.business_name || "Business details"} subtitle="Complete business profile overview." onClose={closeModal} size="lg">
          <div className="business-modal-grid">
            {[
              ["Business name", modalState.business.business_name],
              ["Owner name", modalState.business.owner_name],
              ["Category", modalState.business.category_name],
              ["Village", modalState.business.village_name],
              ["Address", modalState.business.address],
              ["Phone", modalState.business.phone],
              ["Email", modalState.business.email],
              ["Website", modalState.business.website],
              ["WhatsApp", modalState.business.whatsapp],
              ["Facebook", modalState.business.facebook],
              ["Instagram", modalState.business.instagram],
              ["YouTube", modalState.business.youtube],
              ["Opening time", modalState.business.opening_time],
              ["Closing time", modalState.business.closing_time],
              ["Days open", Array.isArray(modalState.business.days_open) ? modalState.business.days_open.join(", ") : modalState.business.days_open],
              ["Tagline", modalState.business.tagline],
              ["Established year", modalState.business.established_year],
              ["Business license", modalState.business.business_license],
              ["GST number", modalState.business.gst_number],
              ["Offers", modalState.business.offers],
              ["Services", modalState.business.services],
              ["Admin remark", modalState.business.admin_remark],
              ["Status", modalState.business.status ? modalState.business.status : "pending"],
            ].map(([label, value]) => (
              <div key={label}>
                <label className="muted">{label}</label>
                <div>{label === "Status" ? <span className={`status-pill small ${String(value).toLowerCase()}`}>{String(value)}</span> : value || "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â"}</div>
              </div>
            ))}
          </div>
        </AdminModal>
      ) : null}

      {modalState.open && modalState.type === "edit" && modalState.business ? (
        <AdminModal open={modalState.open} title="Edit business" subtitle="Update the selected business information in-place." onClose={closeModal} size="lg" actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleModalConfirm} disabled={modalState.loading}>{modalState.loading ? "Saving..." : "Save changes"}</button>
          </>
        )}>
          <div className="admin-form-grid">
            <label className="field-block"><span>Logo / image URL</span><input className="field" value={modalState.editForm.logo_url || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, logo_url: event.target.value } }))} placeholder="Image URL" /></label>
            <label className="field-block"><span>Business name</span><input className="field" value={modalState.editForm.business_name || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, business_name: event.target.value } }))} /></label>
            <label className="field-block"><span>Owner name</span><input className="field" value={modalState.editForm.owner_name || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, owner_name: event.target.value } }))} /></label>
            <label className="field-block"><span>Category</span><select className="field" value={modalState.editForm.category_id || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, category_id: event.target.value } }))}><option value="">Select category</option>{(Array.isArray(categories) ? categories : []).map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}</select></label>
            <label className="field-block"><span>Village</span><select className="field" value={modalState.editForm.village_id || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, village_id: event.target.value } }))}><option value="">Select village</option>{(Array.isArray(villages) ? villages : []).map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}</select></label>
            <label className="field-block"><span>Address</span><input className="field" value={modalState.editForm.address || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, address: event.target.value } }))} /></label>
            <label className="field-block"><span>Phone</span><input className="field" value={modalState.editForm.phone || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, phone: event.target.value } }))} /></label>
            <label className="field-block"><span>Email</span><input className="field" value={modalState.editForm.email || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, email: event.target.value } }))} /></label>
            <label className="field-block"><span>Website</span><input className="field" value={modalState.editForm.website || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, website: event.target.value } }))} /></label>
            <label className="field-block"><span>WhatsApp</span><input className="field" value={modalState.editForm.whatsapp || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, whatsapp: event.target.value } }))} /></label>
            <label className="field-block"><span>Facebook</span><input className="field" value={modalState.editForm.facebook || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, facebook: event.target.value } }))} /></label>
            <label className="field-block"><span>Instagram</span><input className="field" value={modalState.editForm.instagram || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, instagram: event.target.value } }))} /></label>
            <label className="field-block"><span>YouTube</span><input className="field" value={modalState.editForm.youtube || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, youtube: event.target.value } }))} /></label>
            <label className="field-block"><span>Opening time</span><input className="field" type="time" value={modalState.editForm.opening_time || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, opening_time: event.target.value } }))} /></label>
            <label className="field-block"><span>Closing time</span><input className="field" type="time" value={modalState.editForm.closing_time || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, closing_time: event.target.value } }))} /></label>
            <label className="field-block"><span>Tagline</span><input className="field" value={modalState.editForm.tagline || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, tagline: event.target.value } }))} /></label>
            <label className="field-block"><span>Established year</span><input className="field" type="number" value={modalState.editForm.established_year || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, established_year: event.target.value } }))} /></label>
            <label className="field-block"><span>Business license</span><input className="field" value={modalState.editForm.business_license || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, business_license: event.target.value } }))} /></label>
            <label className="field-block"><span>GST number</span><input className="field" value={modalState.editForm.gst_number || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, gst_number: event.target.value } }))} /></label>
            <label className="field-block field-span-2"><span>Days open</span><input className="field" value={(modalState.editForm.days_open || []).join(", ")} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, days_open: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } }))} placeholder="Monday, Tuesday" /></label>
            <label className="field-block field-span-2"><span>Offers</span><input className="field" value={modalState.editForm.offers || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, offers: event.target.value } }))} /></label>
            <label className="field-block field-span-2"><span>Services</span><input className="field" value={modalState.editForm.services || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, services: event.target.value } }))} /></label>
            <label className="field-block field-span-2"><span>Description</span><textarea className="field" rows={4} value={modalState.editForm.description || ""} onChange={(event) => setModalState((current) => ({ ...current, editForm: { ...current.editForm, description: event.target.value } }))} /></label>
          </div>
        </AdminModal>
      ) : null}

      {modalState.open && ["approve", "suspend", "reject", "restore", "delete", "verify", "revoke"].includes(modalState.type) && modalState.business ? (
        <AdminModal open={modalState.open} title={
          modalState.type === "approve" ? "Approve business" :
          modalState.type === "suspend" ? "Suspend business" :
          modalState.type === "reject" ? "Reject business" :
          modalState.type === "restore" ? "Restore business" :
          modalState.type === "delete" ? "Delete business" :
          modalState.type === "verify" ? "Verify business" :
          modalState.type === "revoke" ? "Revoke verification" :
          "Confirm action"
        } subtitle={
          modalState.type === "approve" ? `Approve ${modalState.business.business_name || "this business"}?` :
          modalState.type === "suspend" ? `Suspend ${modalState.business.business_name || "this business"}?` :
          modalState.type === "reject" ? `Reject ${modalState.business.business_name || "this business"}?` :
          modalState.type === "restore" ? `Restore ${modalState.business.business_name || "this business"}?` :
          modalState.type === "delete" ? `Delete ${modalState.business.business_name || "this business"}?` :
          modalState.type === "verify" ? `Grant blue tick to ${modalState.business.business_name || "this business"}?` :
          modalState.type === "revoke" ? `Revoke blue tick from ${modalState.business.business_name || "this business"}?` :
          `Confirm action for ${modalState.business.business_name || "this business"}?`
        } onClose={closeModal} size="md" actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className={`btn ${["delete", "reject", "revoke"].includes(modalState.type) ? "btn-danger" : "btn-primary"}`} onClick={handleModalConfirm} disabled={modalState.loading}>{modalState.loading ? "Please wait..." :
              modalState.type === "delete" ? "Delete" :
              modalState.type === "reject" ? "Reject" :
              modalState.type === "approve" ? "Approve" :
              modalState.type === "suspend" ? "Suspend" :
              modalState.type === "restore" ? "Restore" :
              modalState.type === "verify" ? "Verify" :
              modalState.type === "revoke" ? "Revoke" :
              "Confirm"
            }</button>
          </>
        )}>
          {modalState.type === "reject" ? (
            <textarea className="field" value={modalState.remark} onChange={(event) => setModalState((current) => ({ ...current, remark: event.target.value }))} placeholder="Rejection remark" rows={4} />
          ) : null}
        </AdminModal>
      ) : null}

      {followerState.business ? (
        <AdminModal open title={"Followers - " + (followerState.business.business_name || "Business")} subtitle="Manage follower rows; blue tick is automatic at 500 followers." onClose={() => setFollowerState({ business: null, rows: [], count: "", loading: false })} size="lg" actions={(
          <button type="button" className="btn btn-secondary" onClick={() => setFollowerState({ business: null, rows: [], count: "", loading: false })}>Close</button>
        )}>
          <div className="follower-admin-controls">
            <label className="field-block"><span>Set follower count</span><input className="field" type="number" min="0" value={followerState.count} onChange={(event) => setFollowerState((current) => ({ ...current, count: event.target.value }))} /></label>
            <button type="button" className="btn btn-primary" onClick={() => updateFollowers("set", { count: Number(followerState.count || 0) })}>Apply count</button>
            <button type="button" className="btn btn-secondary" onClick={() => updateFollowers("reset")}>Reset all</button>
          </div>
          {followerState.loading ? <p>Loading followers...</p> : <div className="admin-follower-list">
            {followerState.rows.map((row) => <div className="admin-follower-row" key={row.id}><span><strong>{row.name}</strong> @{row.username} - {row.village_name || "Village not set"}</span><button type="button" className="btn btn-danger btn-sm" onClick={() => updateFollowers("remove", { user_id: row.id })}>Remove</button></div>)}
            {!followerState.rows.length && <p className="muted">No followers on this page.</p>}
          </div>}
        </AdminModal>
      ) : null}

      <style>{`
        .admin-summary-row { display:grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:16px; }
        .summary-card { border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:6px; background: var(--bg-solid); border:1px solid var(--line); }
        .summary-card span { color: var(--text-secondary); font-size:13px; }
        .summary-card strong { font-size:24px; }
        .summary-card-primary { background: rgba(var(--brand-2-rgb, 59, 130, 246),.08); border-color: rgba(var(--brand-2-rgb, 59, 130, 246),.18); }
        .summary-card-success { background: rgba(var(--success-rgb, 16, 185, 129),.08); border-color: rgba(var(--success-rgb, 16, 185, 129),.18); }
        .summary-card-warning { background: rgba(var(--warning-rgb, 234, 179, 8),.08); border-color: rgba(var(--warning-rgb, 234, 179, 8),.18); }
        .summary-card-danger { background: rgba(var(--danger-rgb, 239, 68, 68),.08); border-color: rgba(var(--danger-rgb, 239, 68, 68),.18); }
        .summary-card-muted { background: rgba(var(--text-secondary-rgb, 107, 114, 128),.08); border-color: rgba(var(--text-secondary-rgb, 107, 114, 128),.18); }
        .tab-row { display:flex; gap:8px; flex-wrap:wrap; }
        .business-filter-bar { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; align-items:flex-end; }
        .filter-item { display:flex; flex-direction:column; gap:8px; min-width:220px; }
        .search-filter { position:relative; }
        .search-filter svg { position:absolute; left:12px; top:50%; transform: translateY(-50%); color: var(--muted); }
        .search-filter input { padding-left:36px; }
        .filter-item input, .filter-item select { border:1px solid var(--line); border-radius:12px; padding:10px 12px; width:100%; background: var(--bg-solid); color: var(--text); }
        .admin-form-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
        .business-modal-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
        .business-modal-grid label { font-size:13px; color: var(--text-secondary); display:block; margin-bottom:4px; }
        .admin-table-wrap { overflow-x:auto; }
        .status-pill.small { padding:4px 8px; font-size:11px; text-transform:uppercase; }
        .status-pill.pending { background: rgba(245,158,11,.16); color:var(--warning, #b45309); }
        .status-pill.approved { background: rgba(var(--success-rgb, 16, 185, 129),.16); color:var(--success, #047857); }
        .status-pill.rejected { background: rgba(var(--danger-rgb, 239, 68, 68),.16); color:var(--danger, #b91c1c); }
        .status-pill.suspended { background: rgba(var(--text-secondary-rgb, 107, 114, 128),.16); color:var(--text, #374151); }
        .action-stack { display:flex; gap:6px; flex-wrap:wrap; }
        .field-block { display:flex; flex-direction:column; gap:6px; }
        .field-span-2 { grid-column: span 2; }
        .follower-admin-controls { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px; }
        .follower-admin-controls .field-block { min-width:220px; }
        .admin-follower-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
      `}</style>
    </div>
  );
}
