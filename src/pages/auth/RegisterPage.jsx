import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiKey, FiMail, FiPhone, FiUser, FiUserCheck, FiUserPlus, FiUsers } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { normalizeUsername, validateUsername } from "../../utils/username";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { data: villages = [], loading: villagesLoading } = useApiResource("/api/villages", { initialData: [] });
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    father_name: "",
    village_id: "",
    dob: "",
    gender: "",
    agree_terms: false,
  });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const usernameError = validateUsername(form.username);

  useEffect(() => {
    document.title = "ConnectNKT | Register";
  }, []);

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split("T")[0];
  }, []);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    return date.toISOString().split("T")[0];
  }, []);

  const updateField = (key, value) => {
    const nextValue = key === "username" ? normalizeUsername(value) : key === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((current) => ({ ...current, [key]: nextValue }));
  };

  const payload = () => ({
    ...form,
    name: form.name.trim(),
    username: form.username.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    father_name: form.father_name.trim(),
    village_id: Number(form.village_id),
  });

  const isFormValid = () => (
    !loading &&
    form.agree_terms &&
    !usernameError &&
    form.name.trim() &&
    form.username.trim() &&
    form.email.trim() &&
    form.password.length >= 8 &&
    form.password === form.confirm_password &&
    form.phone.length === 10 &&
    form.father_name.trim() &&
    form.village_id &&
    form.dob &&
    form.gender
  );

  const submitRegistration = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setValidationErrors({});
    try {
      await api.post("/api/auth/register/request-otp", payload());
      setOtpSent(true);
      setSuccess("Verification OTP sent to your email.");
    } catch (e) {
      const response = e?.response?.data || {};
      setError(response.message || e.message || "Registration verification failed.");
      setValidationErrors(response.errors || {});
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setValidationErrors({});
    try {
      const response = await api.post("/api/auth/register/verify-otp", {
        ...payload(),
        otp: otp.trim(),
      });
      const data = response.data?.data || response.data || {};
      login(data.token, data.user);
      navigate("/");
    } catch (e) {
      const response = e?.response?.data || {};
      setError(response.message || e.message || "OTP verification failed.");
      setValidationErrors(response.errors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <style>{`
        .register-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .register-card {
          background: var(--bg-solid);
          border-radius: 14px;
          border: 1px solid var(--line);
          padding: 28px 32px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .register-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .required {
          color: #ef4444;
          font-weight: 700;
        }

        .field,
        .select {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 2px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          height: 50px;
          transition: all 0.25s ease;
        }

        .field:focus,
        .select:focus {
          border-color: var(--brand-2);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }

        .field:disabled,
        .select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .field-error,
        .field-hint {
          font-size: 12px;
          margin-top: 2px;
        }

        .field-error {
          color: #dc2626;
          font-weight: 500;
        }

        .field-hint {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .terms-section {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-subtle);
          border-radius: 10px;
          border: 1px solid var(--line);
        }

        .terms-section input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: var(--brand-2);
          flex-shrink: 0;
        }

        .terms-section label {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .terms-section a,
        .login-link {
          color: var(--brand-2);
          font-weight: 600;
          text-decoration: none;
        }

        .terms-section a:hover,
        .login-link:hover {
          text-decoration: underline;
        }

        .status-message {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.12);
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.12);
        }

        .status-message ul {
          margin: 0;
          padding-left: 16px;
          font-weight: 400;
        }

        .form-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          border-radius: 12px;
          height: 50px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
          min-width: 0;
        }

        .btn-primary {
          flex: 2;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          border: none;
        }

        .btn-secondary {
          flex: 1;
          background: transparent;
          color: var(--text);
          border: 2px solid var(--line);
        }

        .btn-primary:hover:not(:disabled),
        .btn-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .login-section {
          text-align: center;
          font-size: 14px;
          color: var(--text-secondary);
        }

        @media (max-width: 1023px) {
          .register-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .register-page {
            padding: 14px;
          }

          .register-card {
            padding: 20px 16px;
          }

          .register-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary,
          .field,
          .select {
            height: 44px;
            font-size: 13px;
            border-radius: 10px;
          }
        }
      `}</style>

      <PageHeader
        title="Create your account"
        subtitle="Verify your email before your ConnectNKT account is created."
      />

      <div className="register-card">
        {villagesLoading ? (
          <SkeletonCard />
        ) : (
          <form className="register-form" onSubmit={otpSent ? verifyOtpAndCreate : submitRegistration}>
            <div className="register-grid">
              <Field icon={<FiUser />} label="Full Name" value={form.name} onChange={(value) => updateField("name", value)} disabled={loading || otpSent} autoFocus />
              <div className="form-group">
                <label><FiUser /> Username <span className="required">*</span></label>
                <input className="field" value={form.username} onChange={(event) => updateField("username", event.target.value)} disabled={loading || otpSent} required />
                {usernameError ? <div className="field-error">{usernameError}</div> : <div className="field-hint">3-30 characters: letters, numbers, dot, or underscore</div>}
              </div>
              <Field icon={<FiMail />} label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} disabled={loading || otpSent} autoComplete="email" />
              <Field icon={<FiKey />} label="Password" type="password" value={form.password} onChange={(value) => updateField("password", value)} disabled={loading || otpSent} autoComplete="new-password" hint="Minimum 8 characters" />
              <Field icon={<FiKey />} label="Confirm Password" type="password" value={form.confirm_password} onChange={(value) => updateField("confirm_password", value)} disabled={loading || otpSent} autoComplete="new-password" error={form.confirm_password && form.password !== form.confirm_password ? "Passwords do not match." : ""} />
              <Field icon={<FiPhone />} label="Phone" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} disabled={loading || otpSent} autoComplete="tel" hint={form.phone ? `${form.phone.length}/10 digits` : ""} />
              <Field icon={<FiUserCheck />} label="Father's Name" value={form.father_name} onChange={(value) => updateField("father_name", value)} disabled={loading || otpSent} />
              <div className="form-group">
                <label><FiUsers /> Village <span className="required">*</span></label>
                <select className="select" value={form.village_id} onChange={(event) => updateField("village_id", event.target.value)} disabled={loading || otpSent || villagesLoading} required>
                  <option value="">Select your village</option>
                  {villages.map((village) => (
                    <option key={village.id || village.name || village} value={village.id ?? village.name}>
                      {village.name || village}
                    </option>
                  ))}
                </select>
              </div>
              <Field icon={<FiCalendar />} label="DOB" type="date" value={form.dob} onChange={(value) => updateField("dob", value)} disabled={loading || otpSent} min={minDate} max={maxDate} hint="You must be 18 years or older" />
              <div className="form-group">
                <label><FiUser /> Gender <span className="required">*</span></label>
                <select className="select" value={form.gender} onChange={(event) => updateField("gender", event.target.value)} disabled={loading || otpSent} required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              {otpSent && (
                <div className="form-group">
                  <label><FiKey /> Email OTP <span className="required">*</span></label>
                  <input className="field" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} disabled={loading} autoFocus required />
                </div>
              )}
            </div>

            {error && <div className="status-message error"><FiAlertCircle size={18} /><span>{error}</span></div>}
            {success && <div className="status-message success"><FiCheckCircle size={18} /><span>{success}</span></div>}
            {Object.keys(validationErrors).length > 0 && (
              <div className="status-message error">
                <FiAlertCircle size={18} />
                <ul>
                  {Object.entries(validationErrors).map(([field, message]) => <li key={field}>{message}</li>)}
                </ul>
              </div>
            )}

            <div className="terms-section">
              <input id="terms" type="checkbox" checked={form.agree_terms} onChange={(event) => updateField("agree_terms", event.target.checked)} disabled={loading || otpSent} />
              <label htmlFor="terms">
                By creating an account, you agree to our{" "}
                <Link to="/pages/privacy-policy">Privacy Policy</Link>,{" "}
                <Link to="/pages/community-guidelines">Community Guidelines</Link>, and{" "}
                <Link to="/pages/terms-conditions">Terms & Conditions</Link>.
              </label>
            </div>

            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={!isFormValid() || loading || (otpSent && otp.length !== 6)}>
                {loading ? <><span className="spinner" /> Please wait...</> : otpSent ? <><FiCheckCircle /> Verify OTP & Create Account</> : <><FiUserPlus /> Send Verification OTP</>}
              </button>
              {otpSent && (
                <button className="btn-secondary" type="button" disabled={loading} onClick={() => { setOtpSent(false); setOtp(""); setSuccess(""); setError(""); }}>
                  Edit Details
                </button>
              )}
            </div>

            <div className="login-section">
              Already have an account? <Link className="login-link" to="/login">Login</Link>
            </div>
          </form>
        )}

        {!villages.length && !loading && !villagesLoading ? (
          <EmptyState title="No villages available" message="The database has no villages yet." />
        ) : null}
      </div>
    </div>
  );
}

function Field({ icon, label, type = "text", value, onChange, disabled, hint, error, autoFocus, autoComplete, min, max }) {
  return (
    <div className="form-group">
      <label>{icon} {label} <span className="required">*</span></label>
      <input
        className="field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        min={min}
        max={max}
        required
      />
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}
