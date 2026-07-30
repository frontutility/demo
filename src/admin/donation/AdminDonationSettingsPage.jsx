import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/profile";

const defaults = {
  qrImage: "",
  upiId: "",
  accountHolderName: "",
  donationEnabled: true,
  showUpi: true,
};

export default function AdminDonationSettingsPage() {
  const context = useOutletContext() || {};
  const showToast = context.showToast;
  const { data: settingsData, loading, refetch } = useApiResource("/api/admin/donation-settings", { initialData: null });
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT Admin | Donation Settings";
  }, []);

  useEffect(() => {
    if (settingsData) {
      setForm({
        qrImage: settingsData.qrImage || "",
        upiId: settingsData.upiId || "",
        accountHolderName: settingsData.accountHolderName || "",
        donationEnabled: settingsData.donationEnabled ?? true,
        showUpi: settingsData.showUpi ?? true,
      });
    }
  }, [settingsData]);

  async function handleQrUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      showToast?.({ type: "error", title: "Invalid File Type", message: "Only JPG, JPEG, PNG, and WEBP formats are allowed." });
      return;
    }

    setUploadingQr(true);
    const data = new FormData();
    data.append("qr_image", file);

    try {
      const response = await api.post("/api/admin/donation-settings/qr", data);
      const payload = response.data?.data ?? response.data ?? {};
      setForm((val) => ({ ...val, qrImage: payload.qrImage || val.qrImage }));
      showToast?.({ type: "success", title: "QR Code Uploaded", message: "QR Code image updated successfully." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Upload Failed", message: error?.response?.data?.message || error.message || "Failed to upload QR Code image." });
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/admin/donation-settings", form);
      showToast?.({ type: "success", title: "Settings Saved", message: "Donation settings updated successfully." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save Failed", message: error?.response?.data?.message || error.message || "Unable to save donation settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settingsData) {
    return (
      <div className="admin-page">
        <PageHeader title="Donation Settings" subtitle="Manage QR code, UPI details, and donation page visibility" />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader title="Donation Settings" subtitle="Manage QR code, UPI details, and donation page visibility" />

      <form onSubmit={handleSave} className="admin-form-stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "800px" }}>
        
        {/* Toggle Options */}
        <SectionCard title="Visibility & Toggles">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={form.donationEnabled}
                onChange={(e) => setForm({ ...form, donationEnabled: e.target.checked })}
                style={{ width: "18px", height: "18px" }}
              />
              <span>Enable Donation Page (Allow users to see QR code and make contributions)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={form.showUpi}
                onChange={(e) => setForm({ ...form, showUpi: e.target.checked })}
                style={{ width: "18px", height: "18px" }}
              />
              <span>Show UPI ID & Account Holder Name below QR Code</span>
            </label>
          </div>
        </SectionCard>

        {/* QR Code Upload Section */}
        <SectionCard title="QR Code Image">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {form.qrImage ? (
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                <img
                  src={resolveMediaUrl(form.qrImage)}
                  alt="QR Code Preview"
                  style={{ width: "150px", height: "150px", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem", background: "#fff" }}
                />
                <div>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#64748b" }}>Current QR Code Image</p>
                  <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-block" }}>
                    {uploadingQr ? "Uploading..." : "Replace QR Image"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" onChange={handleQrUpload} hidden disabled={uploadingQr} />
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#64748b" }}>No QR Code uploaded yet.</p>
                <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                  {uploadingQr ? "Uploading..." : "Upload QR Image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" onChange={handleQrUpload} hidden disabled={uploadingQr} />
                </label>
              </div>
            )}
            <small style={{ color: "#94a3b8" }}>Allowed formats: JPG, JPEG, PNG, WEBP.</small>
          </div>
        </SectionCard>

        {/* UPI Details */}
        <SectionCard title="UPI Payment Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>UPI ID</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. connectnkt@upi or 9876543210@ybl"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Account Holder Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. ConnectNKT Foundation"
                value={form.accountHolderName}
                onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>
        </SectionCard>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}>
            {saving ? "Saving Changes..." : "Save Donation Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
