import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiImage, FiPlusCircle } from "react-icons/fi";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function initialState() {
  return {
    logo: "",
    logo_url: "",
    business_name: "",
    owner_name: "",
    category_id: "",
    village_id: "",
    address: "",
    website: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    youtube: "",
    opening_time: "",
    closing_time: "",
    days_open: [],
    tagline: "",
    established_year: new Date().getFullYear(),
    phone: "",
    email: "",
    description: "",
    business_license: "",
    gst_number: "",
  };
}

export default function BusinessRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { data: categories = [] } = useApiResource("/api/business/categories", { initialData: [] });
  const { data: villages = [] } = useApiResource("/api/villages", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT | Register Business";
  }, []);

  useEffect(() => {
    if (!editId) {
      setForm(initialState());
      setPreview("");
      setErrors({});
      return;
    }

    async function loadBusiness() {
      try {
        const response = await api.get(`/api/business/details/${editId}`);
        const business = response?.data?.data || response?.data || {};
        setForm({
          ...initialState(),
          ...business,
          category_id: business.category_id ? String(business.category_id) : "",
          village_id: business.village_id ? String(business.village_id) : "",
          days_open: Array.isArray(business.days_open) ? business.days_open : [],
          logo_url: business.logo_url || business.logo || "",
          logo: "",
        });
        setPreview(business.logo_url || business.logo || "");
      } catch (error) {
        setErrors({ form: error?.response?.data?.message || "Unable to load this business." });
      }
    }

    loadBusiness();
  }, [editId]);

  const title = useMemo(() => (editId ? "Edit Business" : "Register Business"), [editId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleDaysToggle(day) {
    setForm((current) => {
      const currentDays = Array.isArray(current.days_open) ? current.days_open : [];
      const nextDays = currentDays.includes(day) ? currentDays.filter((item) => item !== day) : [...currentDays, day];
      return { ...current, days_open: nextDays };
    });
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result || ""));
      setForm((current) => ({ ...current, logo: String(reader.result || ""), logo_url: "" }));
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const nextErrors = {};
    if (!form.logo && !form.logo_url) nextErrors.logo = "Logo or image is required.";
    if (!String(form.business_name || "").trim()) nextErrors.business_name = "Business name is required.";
    if (!String(form.owner_name || "").trim()) nextErrors.owner_name = "Owner name is required.";
    if (!String(form.category_id || "").trim()) nextErrors.category_id = "Category is required.";
    if (!String(form.village_id || "").trim()) nextErrors.village_id = "Village is required.";
    if (!String(form.address || "").trim()) nextErrors.address = "Address is required.";
    if (!String(form.established_year || "").trim()) nextErrors.established_year = "Established year is required.";
    if (!String(form.phone || "").trim()) nextErrors.phone = "Phone number is required.";
    if (!String(form.email || "").trim()) nextErrors.email = "Email is required.";
    const taglineWords = String(form.tagline || "").trim().split(/\s+/).filter(Boolean);
    if (form.tagline && taglineWords.length > 10) nextErrors.tagline = "Tagline must be 10 words or fewer.";
    const descriptionWords = String(form.description || "").trim().split(/\s+/).filter(Boolean);
    if (form.description && descriptionWords.length > 200) nextErrors.description = "Description must be 200 words or fewer.";
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setSuccessMessage("");
    try {
      const payload = {
        ...form,
        days_open: form.days_open,
        category_id: form.category_id,
        village_id: form.village_id,
        established_year: Number(form.established_year || new Date().getFullYear()),
      };
      const response = editId
        ? await api.put(`/api/business/update/${editId}`, payload)
        : await api.post("/api/business/register", payload);
      const data = response?.data?.data || response?.data || {};
      setSuccessMessage(editId ? "Business updated successfully." : "Your business has been submitted for review.");
      setErrors({});
      if (!editId) {
        setTimeout(() => navigate("/profile/my-businesses"), 500);
      } else {
        setTimeout(() => navigate(`/business/${data.id || editId}`), 500);
      }
    } catch (error) {
      const serverErrors = error?.response?.data?.errors || {};
      setErrors(serverErrors && Object.keys(serverErrors).length ? serverErrors : { form: error?.response?.data?.message || "Unable to save business." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="business-register-page">
      <div className="card card-pad">
        <div className="page-header-row">
          <div>
            <div className="eyebrow">Business profile</div>
            <h1>{title}</h1>
            <p>{user?.loggedIn ? "Complete the form below to list your business." : "Please log in to register a business."}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/profile/my-businesses")}>My Businesses</button>
        </div>

        {successMessage ? <div className="success-banner">✅ {successMessage}</div> : null}
        {errors.form ? <div className="error-banner">❌ {errors.form}</div> : null}

        <form className="business-form-grid" onSubmit={handleSubmit}>
          <label className="field-block field-span-2">
            <span>Logo / Image</span>
            <div className="upload-box">
              <input type="file" accept="image/*" onChange={handleLogoChange} />
              {preview ? <img src={preview} alt="Preview" className="preview-image" /> : <div className="upload-placeholder"><FiImage /> <span>Click to upload logo</span></div>}
            </div>
            {errors.logo ? <small className="field-error">{errors.logo}</small> : null}
          </label>

          <label className="field-block">
            <span>Business Name</span>
            <input name="business_name" value={form.business_name} onChange={handleChange} placeholder="Business name" />
            {errors.business_name ? <small className="field-error">{errors.business_name}</small> : null}
          </label>

          <label className="field-block">
            <span>Owner Name</span>
            <input name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="Owner name" />
            {errors.owner_name ? <small className="field-error">{errors.owner_name}</small> : null}
          </label>

          <label className="field-block">
            <span>Category</span>
            <select name="category_id" value={form.category_id} onChange={handleChange}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {errors.category_id ? <small className="field-error">{errors.category_id}</small> : null}
          </label>

          <label className="field-block">
            <span>Village</span>
            <select name="village_id" value={form.village_id} onChange={handleChange}>
              <option value="">Select village</option>
              {villages.map((village) => <option key={village.id} value={village.id}>{village.name}</option>)}
            </select>
            {errors.village_id ? <small className="field-error">{errors.village_id}</small> : null}
          </label>

          <label className="field-block field-span-2">
            <span>Address</span>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Street / landmark / area" />
            {errors.address ? <small className="field-error">{errors.address}</small> : null}
          </label>

          <label className="field-block"><span>Website</span><input name="website" value={form.website} onChange={handleChange} /></label>
          <label className="field-block"><span>WhatsApp</span><input name="whatsapp" value={form.whatsapp} onChange={handleChange} /></label>
          <label className="field-block"><span>Facebook</span><input name="facebook" value={form.facebook} onChange={handleChange} /></label>
          <label className="field-block"><span>Instagram</span><input name="instagram" value={form.instagram} onChange={handleChange} /></label>
          <label className="field-block"><span>YouTube</span><input name="youtube" value={form.youtube} onChange={handleChange} /></label>
          <label className="field-block"><span>Opening Time</span><input name="opening_time" type="time" value={form.opening_time} onChange={handleChange} /></label>
          <label className="field-block"><span>Closing Time</span><input name="closing_time" type="time" value={form.closing_time} onChange={handleChange} /></label>
          <label className="field-block"><span>Tagline</span><input name="tagline" value={form.tagline} onChange={handleChange} maxLength="100" /></label>
          <label className="field-block"><span>Established Year</span><input name="established_year" type="number" value={form.established_year} onChange={handleChange} /></label>
          <label className="field-block"><span>Phone Number</span><input name="phone" value={form.phone} onChange={handleChange} /></label>
          <label className="field-block"><span>Email</span><input name="email" value={form.email} onChange={handleChange} /></label>
          <label className="field-block"><span>Business License</span><input name="business_license" value={form.business_license} onChange={handleChange} /></label>
          <label className="field-block"><span>GST Number</span><input name="gst_number" value={form.gst_number} onChange={handleChange} /></label>

          <div className="field-block field-span-2">
            <span>Days Open</span>
            <div className="days-pills">
              {daysOfWeek.map((day) => (
                <button type="button" key={day} className={`pill-btn ${form.days_open.includes(day) ? "active" : ""}`} onClick={() => handleDaysToggle(day)}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <label className="field-block field-span-2">
            <span>Description</span>
            <textarea name="description" rows="4" value={form.description} onChange={handleChange} placeholder="Describe your services" />
            {errors.description ? <small className="field-error">{errors.description}</small> : null}
          </label>

          <div className="field-span-2 form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}><FiPlusCircle /> {submitting ? "Submitting..." : editId ? "Update Business" : "Register Business"}</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/profile/my-businesses")}>Cancel</button>
          </div>
        </form>
      </div>

      <style>{`
        .business-register-page { display:flex; flex-direction:column; gap:16px; }
        .page-header-row { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; }
        .business-form-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:14px; margin-top:16px; }
        .field-block { display:flex; flex-direction:column; gap:6px; }
        .field-span-2 { grid-column: span 2; }
        .field-block span { font-size:13px; font-weight:600; color: var(--text-secondary); }
        .field-block input, .field-block select, .field-block textarea { width:100%; border:1px solid var(--line); border-radius:10px; padding:10px 12px; background: var(--bg-solid); color: var(--text); }
        .upload-box { display:flex; flex-direction:column; gap:10px; padding:12px; border:1px dashed var(--line); border-radius:12px; background: var(--bg-soft); }
        .upload-box input { border:none; padding:0; }
        .preview-image { width:140px; height:140px; object-fit:cover; border-radius:12px; }
        .upload-placeholder { display:flex; align-items:center; gap:8px; color: var(--text-secondary); }
        .days-pills { display:flex; flex-wrap:wrap; gap:8px; }
        .pill-btn { border:1px solid var(--line); background: var(--bg-solid); color: var(--text); border-radius:999px; padding:8px 12px; }
        .pill-btn.active { background: rgba(37,99,235,.1); color:#2563eb; border-color:rgba(37,99,235,.25); }
        .form-actions { display:flex; gap:10px; justify-content:flex-start; }
        .success-banner { padding:12px 14px; border-radius:10px; background: rgba(16,185,129,.12); color:#047857; margin-top:12px; }
        .error-banner { padding:12px 14px; border-radius:10px; background: rgba(239,68,68,.12); color:#b91c1c; margin-top:12px; }
        .field-error { color:#b91c1c; font-size:12px; }
        @media (max-width:768px) { .business-form-grid { grid-template-columns:1fr; } .field-span-2 { grid-column:auto; } }
      `}</style>
    </div>
  );
}
