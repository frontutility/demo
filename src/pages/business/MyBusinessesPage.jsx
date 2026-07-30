import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEdit2, FiTrash2, FiPlusCircle } from "react-icons/fi";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/profile";

const statusColors = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  suspended: "gray",
};

export default function MyBusinessesPage() {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const { data: businesses = [], loading, refetch } = useApiResource("/api/business/my", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT | My Businesses";
  }, []);

  const rows = useMemo(() => Array.isArray(businesses) ? businesses : [], [businesses]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this business?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/business/delete/${id}`);
      refetch();
    } catch (error) {
      alert(error?.response?.data?.message || "Unable to delete business.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="my-businesses-page">
      <div className="card card-pad">
        <div className="page-header-row">
          <div>
            <div className="eyebrow">Your listings</div>
            <h1>My Businesses</h1>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/Register-Business")}>
            <FiPlusCircle /> Register Business
          </button>
        </div>

        {loading ? <div className="muted">Loading your businesses...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Business Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((business) => {
                  const businessStatus = String(business.status || "pending").toLowerCase();
                  return (
                    <tr key={business.id}>
                      <td><div className="logo-cell">{business.logo_url ? <img src={resolveMediaUrl(business.logo_url)} alt={business.business_name} /> : <span>—</span>}</div></td>
                      <td><strong>{business.business_name}</strong></td>
                      <td>{business.category_name || "—"}</td>
                      <td><span className={`status-pill ${statusColors[businessStatus] || "gray"}`}>{businessStatus.toUpperCase()}</span></td>
                      <td>{business.created_at ? new Date(business.created_at).toLocaleDateString() : "—"}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/business/${business.id}`)}><FiEye /></button>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/Register-Business?editId=${business.id}`)}><FiEdit2 /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(business.id)} disabled={deletingId === business.id}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan="6" className="muted">No businesses found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .my-businesses-page { display:flex; flex-direction:column; gap:16px; }
        .page-header-row { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; }
        .table-wrap { overflow-x:auto; margin-top:14px; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:10px 8px; border-bottom:1px solid var(--line); text-align:left; }
        .logo-cell { width:48px; height:48px; border-radius:10px; overflow:hidden; background:var(--bg-soft); display:flex; align-items:center; justify-content:center; }
        .logo-cell img { width:100%; height:100%; object-fit:cover; }
        .status-pill { display:inline-flex; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; text-transform:uppercase; }
        .status-pill.orange { background: rgba(245,158,11,.16); color:#b45309; }
        .status-pill.green { background: rgba(16,185,129,.16); color:#047857; }
        .status-pill.red { background: rgba(239,68,68,.16); color:#b91c1c; }
        .status-pill.gray { background: rgba(107,114,128,.16); color:#374151; }
        .action-buttons { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .btn-sm { padding:6px 8px; }
        .btn-danger { background: rgba(239,68,68,.1); color:#b91c1c; border:1px solid rgba(239,68,68,.2); }
      `}</style>
    </div>
  );
}
