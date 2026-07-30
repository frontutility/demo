import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";

const emptyForm = { nav_key: "", name: "", route: "/", location: "header", enabled: true, auth_required: false, sort_order: 0 };
const locations = ["header", "left_sidebar", "right_sidebar", "mobile", "footer", "profile"];

export default function AdminNavigationPage() {
  const { showToast } = useOutletContext();
  const { data: items = [], loading, refetch } = useApiResource("/api/admin/navigation", { initialData: [] });
  const [form, setForm] = useState(emptyForm);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { document.title = "ConnectNKT Admin | Navigation Management"; }, []);

  const grouped = useMemo(() => items.reduce((groups, item) => {
    const location = item.location || "other";
    groups[location] = [...(groups[location] || []), item];
    return groups;
  }, {}), [items]);

  async function toggle(item) {
    setSavingId(item.id);
    try {
      await api.patch(`/api/admin/navigation/${item.id}`, { enabled: !item.enabled });
      window.dispatchEvent(new Event("navigation-settings-updated"));
      refetch();
      showToast?.({ type: "success", title: "Navigation updated", message: `${item.name} is now ${item.enabled ? "OFF" : "ON"}.` });
    } catch (error) {
      showToast?.({ type: "error", title: "Update failed", message: error?.response?.data?.message || error.message || "Unable to update navigation." });
    } finally { setSavingId(null); }
  }

  async function create(event) {
    event.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/admin/navigation", form);
      setForm(emptyForm);
      refetch();
      window.dispatchEvent(new Event("navigation-settings-updated"));
      showToast?.({ type: "success", title: "Navigation created", message: "The new link is available in its selected location." });
    } catch (error) {
      showToast?.({ type: "error", title: "Create failed", message: error?.response?.data?.message || error.message || "Unable to create navigation." });
    } finally { setCreating(false); }
  }

  return (
    <div className="stack responsive-admin-page">
      <PageHeader title="Navigation Management" subtitle="Control the visibility of user navigation links without changing code." />
      <SectionCard title="Add Navigation Link">
        <form className="admin-form-grid" onSubmit={create}>
          <input className="admin-field" required pattern="[a-z0-9][a-z0-9_-]{1,119}" value={form.nav_key} onChange={(event) => setForm((value) => ({ ...value, nav_key: event.target.value }))} placeholder="Navigation key" />
          <input className="admin-field" required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Navigation name" />
          <input className="admin-field" required value={form.route} onChange={(event) => setForm((value) => ({ ...value, route: event.target.value }))} placeholder="Route / URL" />
          <select className="admin-select" value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))}>{locations.map((location) => <option key={location} value={location}>{location.replace("_", " ")}</option>)}</select>
          <input className="admin-field" type="number" min="0" value={form.sort_order} onChange={(event) => setForm((value) => ({ ...value, sort_order: event.target.value }))} placeholder="Sort order" />
          <label className="admin-checkbox"><input type="checkbox" checked={form.auth_required} onChange={(event) => setForm((value) => ({ ...value, auth_required: event.target.checked }))} /> Requires login</label>
          <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Adding..." : "Add Link"}</button>
        </form>
      </SectionCard>

      {loading ? <SkeletonCard /> : Object.keys(grouped).map((location) => (
        <SectionCard key={location} title={location.replace("_", " ")}>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ width: "100%" }}>
              <thead><tr><th>Navigation Name</th><th>Route/URL</th><th>Location</th><th>Status</th></tr></thead>
              <tbody>{grouped[location].map((item) => <tr key={item.id}>
                <td>{item.name}</td><td><code>{item.route}</code></td><td>{item.location.replace("_", " ")}</td>
                <td><button type="button" className={`status-toggle ${item.enabled ? "on" : "off"}`} onClick={() => toggle(item)} disabled={savingId === item.id} aria-label={`Turn ${item.name} ${item.enabled ? "off" : "on"}`}>{item.enabled ? "ON" : "OFF"}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </SectionCard>
      ))}
      <style>{`.status-toggle{min-width:58px;border:0;border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer}.status-toggle.on{background:#dcfce7;color:#166534}.status-toggle.off{background:#fee2e2;color:#991b1b}.status-toggle:disabled{opacity:.6;cursor:wait}.admin-checkbox{display:flex;align-items:center;gap:8px;font-size:13px}`}</style>
    </div>
  );
}
