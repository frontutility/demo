import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";

const defaults = {
  websiteName: "ConnectNKT",
  websiteTagline: "Nkt's Own Social Media Platform",
  websiteDescription:
    "ConnectNKT is a hyperlocal social networking platform built exclusively for the people of Neem Ka Thana and its surrounding villages - a digital space where our community connects, shares, and grows together.",
  defaultTheme: "light",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactPhone: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  enableSuggestions: true,
  suggestionsInterval: 15,
  suggestionsCount: 6,
};

export default function AdminSettingsPage() {
  const { showToast } = useOutletContext();
  const { data: settingsData, loading, refetch } = useApiResource("/api/admin/settings", { initialData: null });
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT Admin | Settings";
  }, []);

  useEffect(() => {
    if (settingsData) {
      setForm({
        websiteName: settingsData.websiteName || defaults.websiteName,
        websiteTagline: settingsData.websiteTagline || defaults.websiteTagline,
        websiteDescription: settingsData.websiteDescription || defaults.websiteDescription,
        defaultTheme: settingsData.defaultTheme || defaults.defaultTheme,
        logoUrl: settingsData.logoUrl || "",
        faviconUrl: settingsData.faviconUrl || "",
        contactEmail: settingsData.contactEmail || "",
        contactPhone: settingsData.contactPhone || "",
        facebookUrl: settingsData.facebookUrl || "",
        instagramUrl: settingsData.instagramUrl || "",
        youtubeUrl: settingsData.youtubeUrl || "",
        enableSuggestions: settingsData.enableSuggestions ?? settingsData.enable_suggestions ?? defaults.enableSuggestions,
        suggestionsInterval: settingsData.suggestionsInterval ?? settingsData.suggestions_interval ?? defaults.suggestionsInterval,
        suggestionsCount: settingsData.suggestionsCount ?? settingsData.suggestions_count ?? defaults.suggestionsCount,
      });
    }
  }, [settingsData]);

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((value) => ({ ...value, logoUrl: preview }));
    const data = new FormData();
    data.append("logo", file);
    try {
      const response = await api.post("/api/admin/settings/logo", data);
      const payload = response.data?.data ?? response.data ?? {};
      setForm((value) => ({ ...value, logoUrl: payload.logoUrl || value.logoUrl }));
      showToast?.({ type: "success", title: "Logo uploaded", message: "Logo image saved successfully." });
    } catch (error) {
      showToast?.({ type: "error", title: "Upload failed", message: error?.response?.data?.message || error.message || "Unable to upload logo." });
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/admin/settings", form);
      showToast?.({ type: "success", title: "Settings Saved Successfully", message: "Branding and website settings are live." });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Save failed", message: error?.response?.data?.message || error.message || "Unable to save settings." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack responsive-admin-page">
      <style>{`
        .responsive-admin-page .admin-form-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(clamp(200px, 40vw, 280px), 1fr)) !important;
          gap: clamp(10px, 2vw, 16px) !important;
        }
        .responsive-admin-page .admin-field,
        .responsive-admin-page .admin-select,
        .responsive-admin-page .admin-textarea {
          font-size: clamp(12px, 2vw, 14px) !important;
          padding: clamp(8px, 2vw, 12px) clamp(10px, 2vw, 14px) !important;
        }
        .responsive-admin-page .admin-textarea {
          min-height: clamp(100px, 20vh, 140px) !important;
        }
        .responsive-admin-page .btn {
          font-size: clamp(11px, 1.5vw, 13px) !important;
          padding: clamp(8px, 2vw, 10px) clamp(12px, 2vw, 16px) !important;
        }
        @media (max-width: 768px) {
          .responsive-admin-page .admin-form-grid {
            grid-template-columns: 1fr !important;
          }
          .responsive-admin-page .admin-field,
          .responsive-admin-page .admin-select,
          .responsive-admin-page .admin-textarea {
            font-size: 14px !important;
          }
        }
        @media (max-width: 640px) {
          .responsive-admin-page .admin-field,
          .responsive-admin-page .admin-select,
          .responsive-admin-page .admin-textarea {
            font-size: 16px !important;
          }
          .responsive-admin-page .btn {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .responsive-admin-page .btn {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
        }
      `}</style>
      <PageHeader title="Settings" subtitle="Persist website name, tagline, branding, and theme settings in MySQL." />

      {loading ? (
        <SkeletonCard />
      ) : settingsData ? (
        <form className="stack" onSubmit={handleSave}>
          <SectionCard title="General">
            <div className="admin-form-grid">
              <input className="admin-field admin-full" value={form.websiteName} onChange={(event) => setForm((value) => ({ ...value, websiteName: event.target.value }))} placeholder="Website name" />
              <input className="admin-field admin-full" value={form.websiteTagline} onChange={(event) => setForm((value) => ({ ...value, websiteTagline: event.target.value }))} placeholder="Website tagline" />
              <textarea className="admin-textarea admin-full" value={form.websiteDescription} onChange={(event) => setForm((value) => ({ ...value, websiteDescription: event.target.value }))} placeholder="Website description" />
              <select className="admin-select" value={form.defaultTheme} onChange={(event) => setForm((value) => ({ ...value, defaultTheme: event.target.value }))}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <input className="admin-field" value={form.contactEmail} onChange={(event) => setForm((value) => ({ ...value, contactEmail: event.target.value }))} placeholder="Contact email" />
              <input className="admin-field" value={form.contactPhone} onChange={(event) => setForm((value) => ({ ...value, contactPhone: event.target.value }))} placeholder="Contact phone" />
            </div>
          </SectionCard>

          <SectionCard title="Branding">
            <div className="admin-form-grid">
              <label className="admin-full stack">
                <span className="muted">Logo Upload</span>
                <input className="admin-field admin-full" type="file" accept="image/*,.ico,.svg" onChange={handleLogoUpload} />
              </label>
              {form.logoUrl ? <img src={form.logoUrl} alt="Website logo preview" style={{ width: 120, maxHeight: 80, objectFit: "contain" }} /> : null}
              <input className="admin-field admin-full" value={form.faviconUrl} onChange={(event) => setForm((value) => ({ ...value, faviconUrl: event.target.value }))} placeholder="Favicon URL" />
              <input className="admin-field admin-full" value={form.facebookUrl} onChange={(event) => setForm((value) => ({ ...value, facebookUrl: event.target.value }))} placeholder="Facebook URL" />
              <input className="admin-field admin-full" value={form.instagramUrl} onChange={(event) => setForm((value) => ({ ...value, instagramUrl: event.target.value }))} placeholder="Instagram URL" />
              <input className="admin-field admin-full" value={form.youtubeUrl} onChange={(event) => setForm((value) => ({ ...value, youtubeUrl: event.target.value }))} placeholder="YouTube URL" />
            </div>
          </SectionCard>

          <SectionCard title="Suggestions">
            <div className="admin-form-grid">
              <label className="admin-full stack">
                <span className="muted">Enable Village Profile Suggestions</span>
                <select
                  className="admin-select"
                  value={form.enableSuggestions ? "true" : "false"}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, enableSuggestions: event.target.value === "true" }))
                  }
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <input
                className="admin-field"
                type="number"
                min="5"
                max="50"
                value={form.suggestionsInterval}
                onChange={(event) =>
                  setForm((value) => ({ ...value, suggestionsInterval: Number(event.target.value) || defaults.suggestionsInterval }))
                }
                placeholder="Posts between suggestions (15)"
              />
              <input
                className="admin-field"
                type="number"
                min="3"
                max="12"
                value={form.suggestionsCount}
                onChange={(event) =>
                  setForm((value) => ({ ...value, suggestionsCount: Number(event.target.value) || defaults.suggestionsCount }))
                }
                placeholder="Number of suggestions to show (6)"
              />
            </div>
          </SectionCard>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      ) : (
        <EmptyState title="No settings available" message="The settings record will be created automatically by the backend if it does not exist." />
      )}
    </div>
  );
}
