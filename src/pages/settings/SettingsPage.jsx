import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  FiLogIn, 
  FiUserPlus, 
  FiUser, 
  FiLock, 
  FiShield, 
  FiCheckCircle,
  FiAlertTriangle,
  FiEdit2,
  FiKey,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiLogOut,
  FiAward,
  FiGlobe,
  FiUsers,
  FiUserX
} from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import BlueTickModal from "../../components/modals/BlueTickModal";
import AccountDeletionModal from "../../components/modals/AccountDeletionModal";
import SuccessModal from "../../components/modals/SuccessModal";
import ErrorModal from "../../components/modals/ErrorModal";
import InfoModal from "../../components/modals/InfoModal";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { normalizeUsername, validateUsername } from "../../utils/username";

const profileFieldKeys = ["name", "username", "email", "mobile", "father_name", "bio", "gender", "date_of_birth", "village_id"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useAuth();
  const isAdmin = Boolean(user?.type === "admin" || String(user?.role || "").includes("admin"));
  const profileRef = useRef(null);
  const passwordRef = useRef(null);
  const privacyRef = useRef(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("success");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showBlueTickModal, setShowBlueTickModal] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [messageModal, setMessageModal] = useState({ open: false, type: "info", title: "", message: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    email: "",
    mobile: "",
    father_name: "",
    bio: "",
    gender: "",
    date_of_birth: "",
    village_id: "",
  });
  const [villages, setVillages] = useState([]);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [privacyForm, setPrivacyForm] = useState({
    profile_visibility: "public",
    email_visibility: "public",
    phone_visibility: "public",
    followers_visibility: "public",
    following_visibility: "public",
    show_in_search: 1,
  });
  const usernameError = profileForm.username ? validateUsername(profileForm.username) : "Username is required.";

  useEffect(() => {
    document.title = "ConnectNKT | Settings";
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileForm((current) => ({
      ...current,
      ...Object.fromEntries(profileFieldKeys.map((key) => [key, user?.[key] ?? ""])),
    }));
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const loadPrivacySettings = async () => {
      try {
        const response = await api.get(`/api/user-settings/${user.id}`);
        const payload = response.data.data || response.data;
        setPrivacyForm((current) => ({
          ...current,
          ...payload,
          show_in_search: payload.show_in_search !== undefined ? Number(payload.show_in_search) : current.show_in_search,
        }));
      } catch (error) {
        console.log("Could not load privacy settings (using defaults)");
      }
    };
    loadPrivacySettings();
    // load villages for dropdown
    (async () => {
      try {
        const res = await api.get('/api/villages');
        const payload = res?.data?.data ?? res?.data ?? [];
        setVillages(Array.isArray(payload) ? payload : []);
      } catch (err) {
        setVillages([]);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    const section = location.state?.section;
    const target = section === "password" ? passwordRef.current : section === "privacy" ? privacyRef.current : section === "profile" ? profileRef.current : null;
    if (target) {
      window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location.state]);

  if (!user?.loggedIn) {
    return (
      <div className="stack" style={{ maxWidth: 600, margin: "0 auto" }}>
        <PageHeader
          title="Account Settings"
          subtitle="Sign in to edit your profile, change your password, or manage your account."
        />
        <div className="card card-pad stack" style={{ textAlign: "center", gap: 20 }}>
          <div style={{ fontSize: 48, opacity: 0.5 }}>🔒</div>
          <div className="muted" style={{ fontSize: 16 }}>You need to be logged in to access settings</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="button" onClick={() => navigate("/login")}>
              <FiLogIn /> Login
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate("/register")}>
              <FiUserPlus /> Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  const profilePayload = useMemo(
    () => ({
      name: profileForm.name,
      username: profileForm.username,
      email: profileForm.email,
      mobile: profileForm.mobile,
      father_name: profileForm.father_name,
      bio: profileForm.bio,
      gender: profileForm.gender,
      date_of_birth: profileForm.date_of_birth || null,
      village_id: profileForm.village_id || null,
    }),
    [profileForm]
  );

  function handleBlueTick() {
    setShowBlueTickModal(true);
  }

  function handleBlueTickSuccess() {
    setShowBlueTickModal(false);
    setStatusType("success");
    setStatus("Blue tick request submitted successfully.");
  }

  async function handleSaveProfile() {
    if (!user?.id) return;
    if (usernameError) {
      setStatusType("error");
      setStatus(usernameError);
      return;
    }
    setSavingProfile(true);
    setStatus("");
    try {
      await api.put(`/api/users/${user.id}`, profilePayload);
      await refreshUser?.().catch(() => null);
      setStatusType("success");
      setStatus("Profile updated successfully.");
    } catch (error) {
      setStatusType("error");
      setStatus(error?.response?.data?.message || error.message || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!user?.id) return;
    if (!passwordForm.current_password || !passwordForm.new_password) {
      setStatusType("error");
      setStatus("Current password and new password are required.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setStatusType("error");
      setStatus("New password and confirm password do not match.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setStatusType("error");
      setStatus("New password must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);
    setStatus("");
    try {
      await api.post("/api/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setStatusType("error");
      setStatus(error?.response?.data?.message || error.message || "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSavePrivacy() {
    if (!user?.id) return;
    setSavingPrivacy(true);
    setStatus("");
    try {
      const payload = {
        ...privacyForm,
        show_in_search: Number(privacyForm.show_in_search) === 1 ? 1 : 0,
      };
      await api.put(`/api/user-settings/${user.id}`, payload);
      setStatusType("success");
      setStatus("Privacy settings saved successfully.");
    } catch (error) {
      setStatusType("error");
      setStatus(error?.response?.data?.message || error.message || "Could not save privacy settings");
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleHideAccount() {
    if (!user?.id) return;
    setStatus("");
    try {
      await api.post(`/api/users/${user.id}/hide`);
      setStatusType("success");
      setStatus("Account hidden.");
    } catch (error) {
      setStatusType("error");
      setStatus(error?.response?.data?.message || error.message || "Could not hide account");
    }
  }

  async function handleDeleteAccount() {
    if (!user?.id) return;
    setShowDeleteAccountConfirm(true);
  }

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      // local logout still continues
    }
    logout();
    navigate("/login", { replace: true });
  }

  const StatusIcon = statusType === "success" ? FiCheckCircle : FiAlertTriangle;

  return (
    <div className="settings-page">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile, security, privacy, and account preferences."
      />

      {status && (
        <div className={`status-banner ${statusType}`}>
          <StatusIcon size={18} />
          <span>{status}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="actions-grid">
        <button className="action-card" onClick={() => profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <div className="action-icon" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#3b82f6" }}>
            <FiEdit2 size={22} />
          </div>
          <div>
            <div className="action-label">Edit Profile</div>
            <div className="action-desc">Update your personal information</div>
          </div>
        </button>

         <button className="action-card" onClick={() => passwordRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <div className="action-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
            <FiKey size={22} />
          </div>
          <div>
            <div className="action-label">Change Password</div>
            <div className="action-desc">Update your security credentials</div>
          </div>
        </button> 

        <button className="action-card" onClick={() => privacyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <div className="action-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <FiShield size={22} />
          </div>
          <div>
            <div className="action-label">Privacy Settings</div>
            <div className="action-desc">Control your visibility</div>
          </div>
        </button>

        <button className="action-card" onClick={handleBlueTick}>
          <div className="action-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
            <FiAward size={22} />
          </div>
          <div>
            <div className="action-label">Get Blue Tick</div>
            <div className="action-desc">Apply for verification</div>
          </div>
        </button>

        <button className="action-card" onClick={handleDeleteAccount}>
          <div className="action-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
            <FiTrash2 size={22} />
          </div>
          <div>
            <div className="action-label">Delete Account</div>
            <div className="action-desc">Permanently remove your account</div>
          </div>
        </button>

        <button className="action-card" onClick={handleLogout}>
          <div className="action-icon" style={{ background: "rgba(107, 114, 128, 0.12)", color: "#6b7280" }}>
            <FiLogOut size={22} />
          </div>
          <div>
            <div className="action-label">Logout</div>
            <div className="action-desc">Sign out of your account</div>
          </div>
        </button>

        {isAdmin && (
          <button className="action-card" onClick={handleHideAccount}>
            <div className="action-icon" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
              <FiUserX size={22} />
            </div>
            <div>
              <div className="action-label">Hide Account</div>
              <div className="action-desc">Temporarily hide from public</div>
            </div>
          </button>
        )}
      </div>

      <AccountDeletionModal
        open={showDeleteAccountConfirm}
        userId={user?.id}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onDeleted={() => {
          setShowDeleteAccountConfirm(false);
          logout();
          navigate("/", { replace: true });
        }}
      />
      <SuccessModal
        open={messageModal.open && messageModal.type === "success"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />
      <ErrorModal
        open={messageModal.open && messageModal.type === "danger"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />
      <InfoModal
        open={messageModal.open && messageModal.type === "info"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />

      {/* Profile Section */}
      <div ref={profileRef} className="settings-section">
        <div className="section-header">
          <FiUser size={20} />
          <h2>Edit Profile</h2>
        </div>
        <div className="card card-pad">
          <div className="profile-form-grid">
            <div className="field-group">
              <label>Full Name</label>
              <input className="field" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your full name" />
            </div>
            <div className="field-group">
              <label>Username</label>
              <input className={`field ${usernameError ? "error" : ""}`} value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: normalizeUsername(event.target.value) }))} placeholder="Choose a username" />
              {usernameError ? <div className="field-error">{usernameError}</div> : <div className="field-hint">3–30 characters: letters, numbers, dot, or underscore</div>}
            </div>
            <div className="field-group">
              <label>Email</label>
              <input className="field" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} placeholder="your@email.com" />
            </div>
            <div className="field-group">
              <label>Mobile Number</label>
              <input className="field" value={profileForm.mobile} onChange={(event) => setProfileForm((current) => ({ ...current, mobile: event.target.value }))} placeholder="Your mobile number" />
            </div>
            <div className="field-group">
              <label>Father's Name</label>
              <input className="field" value={profileForm.father_name} onChange={(event) => setProfileForm((current) => ({ ...current, father_name: event.target.value }))} placeholder="Father's full name" />
            </div>
            <div className="field-group">
              <label>Gender</label>
              <select className="select" value={profileForm.gender} onChange={(event) => setProfileForm((current) => ({ ...current, gender: event.target.value }))}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="field-group">
              <label>Date of Birth</label>
              <input className="field" type="date" value={profileForm.date_of_birth} onChange={(event) => setProfileForm((current) => ({ ...current, date_of_birth: event.target.value }))} />
            </div>
            <div className="field-group">
              <label>Village</label>
              <select className="select" value={profileForm.village_id || ""} onChange={(event) => setProfileForm((current) => ({ ...current, village_id: event.target.value }))}>
                <option value="">Select village</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group full-width">
              <label>Bio</label>
              <textarea className="textarea" rows={3} value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell us about yourself" />
            </div>
          </div>
          <button className="btn btn-primary" type="button" style={{ width: "fit-content", marginTop: 16 }} disabled={savingProfile} onClick={handleSaveProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Password Section */}
       <div ref={passwordRef} className="settings-section">
        <div className="section-header">
          <FiKey size={20} />
          <h2>Change Password</h2>
        </div>
        <div className="card card-pad">
          <div className="password-form-grid">
            <div className="field-group">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  className="field"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                  placeholder="Enter current password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div className="field-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  className="field"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                  placeholder="Enter new password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Must be at least 6 characters</div>
            </div>
            <div className="field-group full-width">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  className="field"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirm_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                  placeholder="Confirm new password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" type="button" style={{ width: "fit-content", marginTop: 16 }} disabled={changingPassword} onClick={handleChangePassword}>
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div> 

      {/* Privacy Section */}
      <div ref={privacyRef} className="settings-section">
        <div className="section-header">
          <FiShield size={20} />
          <h2>Privacy Settings</h2>
        </div>
        <div className="card card-pad">
          <div className="privacy-grid">
            <div className="privacy-group">
              <label className="privacy-label">
                <FiUser size={16} />
                Profile Visibility
              </label>
              <div className="radio-group">
                {["public", "followers", "private"].map((value) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="profile_visibility"
                      value={value}
                      checked={privacyForm.profile_visibility === value}
                      onChange={(e) => setPrivacyForm((current) => ({ ...current, profile_visibility: e.target.value }))}
                    />
                    <span>{value === "followers" ? "👥 Followers Only" : value === "public" ? "🌍 Public" : "🔒 Private"}</span>
                  </label>
                ))}
              </div>
              <div className="privacy-hint">
                {privacyForm.profile_visibility === "public"
                  ? "Anyone can view your profile"
                  : privacyForm.profile_visibility === "followers"
                  ? "Only your followers can view your profile"
                  : "Only you can view your profile"}
              </div>
            </div>

            <div className="privacy-group">
              <label className="privacy-label">
                <FiGlobe size={16} />
                Email Visibility
              </label>
              <div className="radio-group">
                {["public", "followers", "private"].map((value) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="email_visibility"
                      value={value}
                      checked={privacyForm.email_visibility === value}
                      onChange={(e) => setPrivacyForm((current) => ({ ...current, email_visibility: e.target.value }))}
                    />
                    <span>{value === "followers" ? "👥 Followers" : value === "public" ? "🌍 Public" : "🔒 Private"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="privacy-group">
              <label className="privacy-label">
                <FiGlobe size={16} />
                Phone Visibility
              </label>
              <div className="radio-group">
                {["public", "followers", "private"].map((value) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="phone_visibility"
                      value={value}
                      checked={privacyForm.phone_visibility === value}
                      onChange={(e) => setPrivacyForm((current) => ({ ...current, phone_visibility: e.target.value }))}
                    />
                    <span>{value === "followers" ? "👥 Followers" : value === "public" ? "🌍 Public" : "🔒 Private"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* <div className="privacy-group">
              <label className="privacy-label">
                <FiUsers size={16} />
                Followers List
              </label>
              <div className="radio-group">
                {["public", "followers", "private"].map((value) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="followers_visibility"
                      value={value}
                      checked={privacyForm.followers_visibility === value}
                      onChange={(e) => setPrivacyForm((current) => ({ ...current, followers_visibility: e.target.value }))}
                    />
                    <span>{value === "followers" ? "👥 Followers" : value === "public" ? "🌍 Public" : "🔒 Private"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="privacy-group">
              <label className="privacy-label">
                <FiUsers size={16} />
                Following List
              </label>
              <div className="radio-group">
                {["public", "followers", "private"].map((value) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="following_visibility"
                      value={value}
                      checked={privacyForm.following_visibility === value}
                      onChange={(e) => setPrivacyForm((current) => ({ ...current, following_visibility: e.target.value }))}
                    />
                    <span>{value === "followers" ? "👥 Followers" : value === "public" ? "🌍 Public" : "🔒 Private"}</span>
                  </label>
                ))}
              </div>
            </div> */}

            <div className="privacy-group checkbox-group">
              <label className="privacy-label">
                <FiCheckCircle size={16} />
                Show in Search
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={Number(privacyForm.show_in_search) === 1}
                  onChange={(e) => setPrivacyForm((current) => ({ ...current, show_in_search: e.target.checked ? 1 : 0 }))}
                />
                <span>Show my profile in search results</span>
              </label>
              <div className="privacy-hint">When enabled, your profile appears in search suggestions and community lists</div>
            </div>
          </div>

          <button className="btn btn-primary" type="button" style={{ width: "fit-content", marginTop: 16 }} disabled={savingPrivacy} onClick={handleSavePrivacy}>
            {savingPrivacy ? "Saving..." : "Save Privacy Settings"}
          </button>
        </div>
      </div>

      <style>{`
        .settings-page {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Status Banner */
        .status-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.15);
          color: #3b82f6;
        }
        .status-banner.success {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .status-banner.error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        /* Actions Grid */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .action-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          color: inherit;
        }
        .action-card:hover {
          border-color: rgba(37, 99, 235, 0.3);
          background: rgba(37, 99, 235, 0.04);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .action-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .action-label {
          font-weight: 600;
          font-size: 14px;
        }
        .action-desc {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 2px;
        }

        /* Settings Sections */
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-header h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        /* Forms */
        .profile-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        .password-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .field-group label {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.8;
        }
        .field-group .field,
        .field-group .select,
        .field-group .textarea {
          width: 100%;
        }
        .full-width {
          grid-column: 1 / -1;
        }

        /* Password Input with Toggle */
        .password-input-wrapper {
          position: relative;
        }
        .password-input-wrapper .field {
          padding-right: 44px;
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.5;
          padding: 4px;
          color: inherit;
        }
        .password-toggle:hover {
          opacity: 1;
        }

        /* Privacy */
        .privacy-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .privacy-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .privacy-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        .radio-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .radio-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--line);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s ease;
          background: var(--bg-solid);
        }
        .radio-label:hover {
          border-color: rgba(37, 99, 235, 0.3);
        }
        .radio-label:has(input:checked) {
          border-color: rgba(37, 99, 235, 0.5);
          background: rgba(37, 99, 235, 0.06);
        }
        .radio-label input {
          margin: 0;
          accent-color: #3b82f6;
        }
        .privacy-hint {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .checkbox-group {
          grid-column: 1 / -1;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
        }
        .checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: #3b82f6;
          margin: 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-form-grid {
            grid-template-columns: 1fr;
          }
          .password-form-grid {
            grid-template-columns: 1fr;
          }
          .privacy-grid {
            grid-template-columns: 1fr;
          }
          .checkbox-group {
            grid-column: auto;
          }
          .full-width {
            grid-column: auto;
          }
          .actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
          .action-card {
            padding: 12px 14px;
          }
          .action-icon {
            width: 36px;
            height: 36px;
          }
          .action-icon svg {
            width: 18px;
            height: 18px;
          }
        }
        @media (max-width: 480px) {
          .actions-grid {
            grid-template-columns: 1fr 1fr;
          }
          .radio-group {
            flex-direction: column;
          }
        }
      `}</style>

      {showBlueTickModal && user?.id && (
        <BlueTickModal open={showBlueTickModal} userId={user.id} onClose={() => setShowBlueTickModal(false)} onSuccess={handleBlueTickSuccess} />
      )}
    </div>
  );
}
