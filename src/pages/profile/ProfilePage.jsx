import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  FiCamera, 
  FiLogOut, 
  FiSettings, 
  FiShield, 
  FiUserPlus, 
  FiLogIn,
  FiUsers,
  FiFileText,
  FiCalendar,
  FiMapPin,
  FiMail,
  FiPhone,
  FiUser,
  FiAward,
  FiShare2,
  FiEdit2,
  FiLock,
  FiPlusCircle,
  FiMoreHorizontal,
  FiFlag,
  FiInfo,
  FiPhoneCall,
  FiBriefcase
} from "react-icons/fi";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import UserNameWithBadge from "../../components/ui/UserNameWithBadge";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import PostCard from "../../components/cards/PostCard";
import BlueTickModal from "../../components/modals/BlueTickModal";
import ConfirmationModal from "../../components/modals/ConfirmationModal";
import AccountDeletionModal from "../../components/modals/AccountDeletionModal";
import SuccessModal from "../../components/modals/SuccessModal";
import ErrorModal from "../../components/modals/ErrorModal";
import InfoModal from "../../components/modals/InfoModal";
import { useOptionalAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { getInitials, getUserAvatarUrl, getProfilePath } from "../../utils/profile";
import { formatCount } from "../../utils/formatters";

const profileReportReasons = [
  "Spam",
  "Fake Information",
  "Harassment",
  "Hate Speech",
  "Violence",
  "Adult Content",
  "Child Safety",
  "Terrorism",
  "Scam",
  "Impersonation",
  "Copyright",
  "Other",
];

function resolveProfileKey(paramsUsername, authUser) {
  const routeKey = String(paramsUsername || "").trim();
  if (routeKey) return routeKey;
  return authUser?.loggedIn ? String(authUser.username || authUser.id || "").trim() : "";
}

function blueTickLabel(status) {
  if (status === "verified") return "Verified";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return "Not requested";
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const authContext = useOptionalAuth();
  const authUser = authContext?.user ?? { loggedIn: false };
  const logout = authContext?.logout ?? (() => {});
  const isAdmin = Boolean(authUser?.type === "admin" || String(authUser?.role || "").includes("admin"));
  const fileInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [profileImageDraft, setProfileImageDraft] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [profile, setProfile] = useState(null);
  const [followState, setFollowState] = useState(false);
  const [followBack, setFollowBack] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("success");
  const [showBlueTickModal, setShowBlueTickModal] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [messageModal, setMessageModal] = useState({ open: false, type: "info", title: "", message: "" });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportCustomReason, setReportCustomReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const profileKey = resolveProfileKey(username, authUser);
  const shouldLoadProfile = Boolean(profileKey);
  const { data: loadedUser, loading: userLoading } = useApiResource(
    shouldLoadProfile ? `/api/user/${encodeURIComponent(profileKey)}` : null,
    { initialData: null }
  );

  const activeProfile = profile || loadedUser;
  const isOwnProfile =
    Boolean(authUser?.loggedIn) &&
    Boolean(activeProfile) &&
    (
      String(activeProfile.id) === String(authUser.id) ||
      String(activeProfile.username || "").toLowerCase() === String(authUser.username || "").toLowerCase() ||
      String(activeProfile.email || "").toLowerCase() === String(authUser.email || "").toLowerCase()
    );

  const canFollow = Boolean(activeProfile?.id && !isOwnProfile);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close more menu on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowMoreMenu(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (typeof activeProfile?.is_following !== "undefined") {
      setFollowState(Boolean(activeProfile.is_following));
      setFollowBack(Boolean(activeProfile.is_followed_by));
    }
  }, [activeProfile?.is_following, activeProfile?.is_followed_by]);

  const { data: profilePosts = [], loading: postsLoading } = useApiResource(
    activeProfile?.id ? `/api/posts/user/${activeProfile.id}` : null,
    { initialData: [] }
  );

  useEffect(() => {
    setProfile(null);
    setFollowState(false);
    setFollowBack(false);
    setProfileImageDraft("");
    setAvatarError("");
  }, [profileKey]);

  useEffect(() => {
    if (!loadedUser) return;
    setProfile(loadedUser);
    setFollowState(Boolean(loadedUser.is_following));
    setFollowBack(Boolean(loadedUser.is_followed_by));
    setProfileImageDraft("");
    setAvatarError("");
  }, [loadedUser]);

  useEffect(() => {
    if (activeProfile?.name) {
      document.title = `ConnectNKT | ${activeProfile.name}`;
    } else {
      document.title = "ConnectNKT | Profile";
    }
  }, [activeProfile?.name]);

  const userPosts = useMemo(() => {
    if (!activeProfile?.id) return [];
    return Array.isArray(profilePosts) ? profilePosts : [];
  }, [activeProfile?.id, profilePosts]);

  const profilePhoto = profileImageDraft || getUserAvatarUrl(activeProfile) || "";

  function isBirthdayToday(dob) {
    if (!dob) return false;
    const today = new Date();
    const birthDate = new Date(dob);
    return (
      today.getMonth() === birthDate.getMonth() &&
      today.getDate() === birthDate.getDate()
    );
  }

  const birthdayToday = isBirthdayToday(activeProfile?.date_of_birth);

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !activeProfile?.id || !isOwnProfile) return;

    setAvatarError("");
    if (file.type !== "image/png") {
      setProfileImageDraft("");
      setAvatarError("Only PNG images are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > 200 * 1024) {
      setProfileImageDraft("");
      setAvatarError("Image size must be less than 200 KB.");
      event.target.value = "";
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImageDraft(String(reader.result || ""));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setAvatarError(error?.message || "Could not load image");
      event.target.value = "";
    }
  }

  async function handleSaveAvatar() {
    if (!activeProfile?.id || !profileImageDraft) return;
    setSavingAvatar(true);
    setAvatarError("");
    try {
      await api.post(`/api/users/${activeProfile.id}/avatar`, {
        profile_image_url: profileImageDraft,
      });
      setProfile((prev) => (prev ? { ...prev, profile_image_url: profileImageDraft } : prev));
      setProfileImageDraft("");
      setStatusType("success");
      setStatus("Profile photo updated successfully.");
    } catch (error) {
      setStatusType("error");
      setAvatarError(error?.response?.data?.message || error.message || "Could not save profile photo");
    } finally {
      setSavingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleCancelAvatar() {
    setProfileImageDraft("");
    setAvatarError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      // local logout still continues
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  function handleBlueTick() {
    if (!isOwnProfile || !activeProfile?.id) return;
    setShowBlueTickModal(true);
  }

  function handleBlueTickRequestSuccess() {
    setShowBlueTickModal(false);
    setMessageModal({
      open: true,
      type: "success",
      title: "Request Submitted",
      message: "Your blue tick request has been submitted successfully.",
    });
  }

  const isHiddenAccount = String(activeProfile?.account_status || "").toLowerCase() === "hidden" || Boolean(activeProfile?.hidden_at);

  async function handleToggleAccountVisibility() {
    if (!activeProfile?.id || !isOwnProfile) return;
    setStatus("");
    try {
      if (isHiddenAccount) {
        await api.post(`/api/users/${activeProfile.id}/restore`);
        setProfile((prev) =>
          prev ? { ...prev, account_status: "active", hidden_at: null, suspended_at: null } : prev
        );
        setStatusType("success");
        setStatus("Account restored.");
      } else {
        await api.post(`/api/users/${activeProfile.id}/hide`);
        setProfile((prev) =>
          prev ? { ...prev, account_status: "hidden", hidden_at: new Date().toISOString() } : prev
        );
        setStatusType("success");
        setStatus("Account hidden.");
      }
    } catch (error) {
      setStatusType("error");
      setStatus(error?.response?.data?.message || error.message || `Could not ${isHiddenAccount ? "show" : "hide"} account`);
    }
  }

  async function handleDeleteAccount() {
    if (!activeProfile?.id || !isOwnProfile) return;
    setShowDeleteAccountConfirm(true);
  }

  function handleDeleteAccountSuccess() {
    setShowDeleteAccountConfirm(false);
    logout();
    navigate("/", { replace: true });
  }

  async function handleFollowToggle() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    if (!activeProfile?.id || isOwnProfile) return;

    setFollowLoading(true);
    const nextFollowState = !followState;
    setFollowState(nextFollowState);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            is_following: nextFollowState,
            followers_count: Math.max(0, Number(prev.followers_count || prev.followers || 0) + (nextFollowState ? 1 : -1)),
          }
        : prev
    );

    try {
      const response = nextFollowState
        ? await api.post(`/api/users/${activeProfile.id}/follow`)
        : await api.delete(`/api/users/${activeProfile.id}/follow`);
      const payload = response?.data?.data ?? response?.data ?? {};
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followers_count: payload.followers_count ?? prev.followers_count,
              following_count: payload.following_count ?? prev.following_count,
              is_following: nextFollowState,
              is_followed_by: typeof payload.is_followed_by !== "undefined" ? Boolean(payload.is_followed_by) : prev.is_followed_by,
            }
          : prev
      );
      if (typeof payload.is_followed_by !== "undefined") {
        setFollowBack(Boolean(payload.is_followed_by));
      }
    } catch (error) {
      setFollowState(followState);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              is_following: followState,
              followers_count: Number(activeProfile.followers_count || activeProfile.followers || 0),
            }
          : prev
      );
      setMessageModal({
        open: true,
        type: "error",
        title: "Unable to update follow status",
        message: error?.response?.data?.message || error.message || "Could not update follow status",
      });
    } finally {
      setFollowLoading(false);
    }
  }

  async function copyProfileLink() {
    const origin = String(window.location.origin || "").replace(/\/+$/, "");
    const path = activeProfile ? getProfilePath(activeProfile) : (profileKey ? `/profile/${encodeURIComponent(String(profileKey))}` : "");
    const target = path ? `${origin.replace(/\/$/, "")}${path}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: activeProfile?.name || "ConnectNKT profile",
          text: activeProfile?.name ? `${activeProfile.name} on ConnectNKT` : "Check this profile on ConnectNKT",
          url: target,
        });
        return;
      }
    } catch (err) {}

    try {
      await navigator.clipboard.writeText(target);
      setMessageModal({
        open: true,
        type: "success",
        title: "Link copied",
        message: "Profile link copied to clipboard.",
      });
    } catch (error) {
      setMessageModal({
        open: true,
        type: "info",
        title: "Copy profile link",
        message: `Use the link below to share manually:\n${target}`,
      });
    }
  }

  async function handleReportProfile() {
    const otherText = reportReason === "Other" ? reportCustomReason.trim() : "";
    const wordCount = otherText.split(/\s+/).filter(Boolean).length;

    if (reportReason === "Other" && !otherText) {
      setMessageModal({
        open: true,
        type: "error",
        title: "Reason required",
        message: "Please describe the reason for reporting this profile.",
      });
      return;
    }

    if (reportReason === "Other" && wordCount > 50) {
      setMessageModal({
        open: true,
        type: "error",
        title: "Reason too long",
        message: "Custom reason must be 50 words or fewer.",
      });
      return;
    }

    setReportLoading(true);
    try {
      await api.post(`/api/users/${activeProfile.id}/report`, {
        report_type: "user",
        reported_user_id: activeProfile.id,
        reason: reportReason,
        custom_reason: otherText,
      });
      setShowReportModal(false);
      setReportReason("Spam");
      setReportCustomReason("");
      setMessageModal({
        open: true,
        type: "success",
        title: "Report submitted",
        message: "Thank you for your report. We will review it shortly.",
      });
    } catch (error) {
      setMessageModal({
        open: true,
        type: "error",
        title: "Unable to submit report",
        message: error?.response?.data?.message || error.message || "Could not submit report.",
      });
    } finally {
      setReportLoading(false);
    }
  }

  if (userLoading || postsLoading) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!activeProfile) {
    return <EmptyState title="User not found" message="The requested profile is not available right now." />;
  }

  return (
    <div className="profile-page">
      {status && (
        <div className={`status-banner ${statusType}`}>
          {statusType === "success" ? "✅" : "❌"} {status}
        </div>
      )}

      {/* Profile Header - Instagram Style */}
      <div className="profile-header">
        <div className="profile-header-left">
          <div className="profile-avatar-wrapper">
            <button
              type="button"
              onClick={() => isOwnProfile && fileInputRef.current?.click()}
              className="profile-avatar-btn"
              disabled={!isOwnProfile}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt={activeProfile.name || "Profile"} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-placeholder">{getInitials(activeProfile.name || activeProfile.username || "User")}</span>
              )}
              {isOwnProfile && (
                <span className="avatar-upload-badge">
                  <FiCamera size={14} />
                </span>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,.png" onChange={handleImageUpload} style={{ display: "none" }} />
            {isOwnProfile && profileImageDraft && (
              <div className="avatar-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSaveAvatar} disabled={savingAvatar}>
                  {savingAvatar ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCancelAvatar} disabled={savingAvatar}>
                  Cancel
                </button>
              </div>
            )}
            {avatarError && <div className="avatar-error">{avatarError}</div>}
          </div>

          <div className="profile-header-info">
            <div className="profile-name-row">
              <div className="profile-name-wrapper">
                <UserNameWithBadge user={activeProfile} name={activeProfile.name || "Account"} link={false} className="profile-name" badgeSize={24} />
              </div>
              <div className="profile-actions-header">
                {canFollow && (
                  <button className={`btn btn-primary follow-btn${followState ? " following" : ""}`} onClick={handleFollowToggle} disabled={followLoading}>
                    {followLoading ? "..." : followState ? "Following" : followBack ? "Follow Back" : "Follow"}
                  </button>
                )}
                <button className="btn btn-secondary action-icon-btn" onClick={copyProfileLink} title="Share Profile">
                  <FiShare2 size={22} />
                </button>
                {isOwnProfile && (
                  <button className="btn btn-secondary action-icon-btn" onClick={() => navigate("/settings", { state: { section: "profile" } })} title="Edit Profile">
                    <FiSettings size={22} />
                  </button>
                )}
                <div className="more-menu-wrapper" ref={moreMenuRef}>
                  <button className="btn btn-secondary action-icon-btn" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                    <FiMoreHorizontal size={22} />
                  </button>
                  {showMoreMenu && (
                    <div className="more-menu-dropdown">
                      {!isOwnProfile && (
                        <button className="more-menu-item" onClick={() => { setShowReportModal(true); setShowMoreMenu(false); }}>
                          <FiFlag /> Report Profile
                        </button>
                      )}
                      <button className="more-menu-item" onClick={() => { setShowContactInfoModal(true); setShowMoreMenu(false); }}>
                        <FiInfo /> Contact Info
                      </button>
                      <button className="more-menu-item" onClick={() => { copyProfileLink(); setShowMoreMenu(false); }}>
                        <FiShare2 /> Share Profile
                      </button>
                      {isOwnProfile && (
                        <>
                          <button className="more-menu-item" onClick={() => { navigate("/settings", { state: { section: "profile" } }); setShowMoreMenu(false); }}>
                            <FiEdit2 /> Edit Profile
                          </button>
                          <button className="more-menu-item" onClick={() => { navigate("/settings", { state: { section: "password" } }); setShowMoreMenu(false); }}>
                            <FiLock /> Change Password
                          </button>
                          <button className="more-menu-item" onClick={() => { handleBlueTick(); setShowMoreMenu(false); }}>
                            <FiShield /> Apply Blue Tick
                          </button>
                          <button className="more-menu-item" onClick={() => { navigate("/post/new"); setShowMoreMenu(false); }}>
                            <FiPlusCircle /> Create Post
                          </button>
                          {isAdmin && (
                            <button className="more-menu-item warning" onClick={() => { handleToggleAccountVisibility(); setShowMoreMenu(false); }}>
                              {isHiddenAccount ? "Show Account" : "Hide Account"}
                            </button>
                          )}
                          <button className="more-menu-item danger" onClick={() => { handleDeleteAccount(); setShowMoreMenu(false); }}>
                            Delete Account
                          </button>
                          <button className="more-menu-item" onClick={() => { handleLogout(); setShowMoreMenu(false); }}>
                            <FiLogOut /> Logout
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-number">{formatCount(activeProfile.followers_count || activeProfile.followers || 0)}</span>
                <span className="stat-label">followers</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">{formatCount(activeProfile.following_count || activeProfile.following || 0)}</span>
                <span className="stat-label">following</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">{formatCount(userPosts.length)}</span>
                <span className="stat-label">posts</span>
              </div>
            </div>

            <div className="profile-bio-section">
              <div className="profile-bio">{activeProfile.bio || "No bio yet"}</div>
            </div>
          </div>
        </div>
      </div>

      {birthdayToday && (
        <div className="birthday-banner">
          🎂 Happy Birthday @{activeProfile.username}! 🎉
        </div>
      )}

      {isOwnProfile && (
        <SectionCard
          title="My Businesses"
          action={
            <button className="btn btn-primary btn-sm" type="button" onClick={() => navigate("/Register-Business")}>Register Business</button>
          }
        >
          <div className="my-businesses-profile-link">
            <div className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiBriefcase /> Manage your business listings and review their status.
            </div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate("/profile/my-businesses")}>View all</button>
          </div>
        </SectionCard>
      )}

      {/* Posts Grid */}
      <SectionCard title={`Posts (${userPosts.length})`}>
        <div className="posts-container">
          {userPosts.length ? (
            userPosts.map((post) => <PostCard key={post.id} post={post} user={activeProfile} compact showPinnedBadge />)
          ) : (
            <EmptyState title="No posts available" message="This profile has no posts yet." />
          )}
        </div>
      </SectionCard>

      {/* Report Modal */}
      <ConfirmationModal
        open={showReportModal}
        title="Report Profile"
        message={
          <div>
            <p style={{ marginBottom: '12px' }}>Please choose a reason for reporting this profile:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {profileReportReasons.map((reason) => (
                <label key={reason} className={`report-chip ${reportReason === reason ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="profile_report_reason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {reportReason === 'Other' && (
              <>
                <textarea
                  className="report-textarea"
                  value={reportCustomReason}
                  onChange={(e) => setReportCustomReason(e.target.value)}
                  placeholder="Describe the issue..."
                  maxLength="500"
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--bg-solid)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '4px' }}>
                  {reportCustomReason.length}/500
                </div>
              </>
            )}
          </div>
        }
        confirmLabel={reportLoading ? "Submitting..." : "Submit Report"}
        cancelLabel="Cancel"
        onConfirm={handleReportProfile}
        onClose={() => { setShowReportModal(false); setReportReason("Spam"); setReportCustomReason(""); }}
        loading={reportLoading}
      />

      {/* Contact Info Modal */}
      <InfoModal
        open={showContactInfoModal}
        title="Contact Info"
        message={
          <div className="contact-info-modal-content">
            {activeProfile?.contact_info?.visible ? (
              <>
                {activeProfile?.contact_info?.email_visible ? (
                  <div className="contact-info-row">
                    <FiMail />
                    <span>{activeProfile.contact_info.email || "Not available"}</span>
                  </div>
                ) : null}
                {activeProfile?.contact_info?.mobile_visible ? (
                  <div className="contact-info-row">
                    <FiPhoneCall />
                    <span>{activeProfile.contact_info.mobile || "Not available"}</span>
                  </div>
                ) : null}
                {activeProfile?.contact_info?.dob_visible ? (
                  <div className="contact-info-row">
                    <FiCalendar />
                    <span>{activeProfile.contact_info.date_of_birth || "Not available"}</span>
                  </div>
                ) : null}
                {!activeProfile?.contact_info?.email_visible && !activeProfile?.contact_info?.mobile_visible && !activeProfile?.contact_info?.dob_visible ? (
                  <p className="contact-info-muted">No contact details are currently shared with you.</p>
                ) : null}
              </>
            ) : (
              <p className="contact-info-muted">{activeProfile?.contact_info?.message || "Contact info is currently restricted."}</p>
            )}
          </div>
        }
        onClose={() => setShowContactInfoModal(false)}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowContactInfoModal(false)}>
            Close
          </button>
        }
      />

      {/* Modals */}
      <BlueTickModal open={showBlueTickModal} userId={activeProfile?.id} onClose={() => setShowBlueTickModal(false)} onSuccess={handleBlueTickRequestSuccess} />
      <AccountDeletionModal
        open={showDeleteAccountConfirm}
        userId={activeProfile?.id}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onDeleted={handleDeleteAccountSuccess}
      />
      <SuccessModal
        open={messageModal.open && messageModal.type === "success"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />
      <ErrorModal
        open={messageModal.open && messageModal.type === "error"}
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

      <style>{`
        .profile-page {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          // padding: 82px 0;
        }

        .contact-info-modal-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--bg-soft);
          color: var(--text);
        }

        .contact-info-muted {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Status Banner */
        .status-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .status-banner.error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        /* Birthday Banner */
        .birthday-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 20px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 18px;
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15));
          border: 2px solid rgba(236, 72, 153, 0.3);
          color: #ec4899;
          text-align: center;
          box-shadow: 0 4px 16px rgba(236, 72, 153, 0.1);
        }

        /* Profile Header - Instagram Style */
        .profile-header {
          background: var(--bg-solid);
          border-radius: 16px;
          border: 1px solid var(--line);
          padding: 18px 22px;
        }

        .profile-header-left {
          display: flex;
          gap: 60px;
          align-items: flex-start;
        }

        .profile-avatar-wrapper {
          flex-shrink: 0;
        }

        .profile-avatar-btn {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          border: 2px solid var(--line);
          background: var(--bg-solid);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          padding: 0;
          display: block;
          transition: all 0.2s ease;
        }

        .profile-avatar-btn:hover .avatar-upload-badge {
          opacity: 1;
          transform: scale(1);
        }

        .profile-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(37,99,235,0.1), rgba(15,118,110,0.1));
          font-size: 56px;
          font-weight: 700;
          color: #3b82f6;
        }

        .avatar-upload-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-solid);
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.2s ease;
        }

        .avatar-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          justify-content: center;
        }

        .avatar-error {
          color: #ef4444;
          font-size: 12px;
          text-align: center;
          margin-top: 6px;
        }

        .btn-sm {
          padding: 4px 14px;
          font-size: 12px;
        }

        .profile-header-info {
          flex: 1;
          padding-top: 8px;
        }

        .profile-name-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .profile-name-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-name {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .profile-actions-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          flex-wrap: wrap;
        }

        .follow-btn {
          padding: 8px 16px;
  font-weight: 600;
  font-size: 12px;
  background: #0095f6;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
        }

  .follow-btn:hover {
  background: #1877f2;
}

.follow-btn:active {
  transform: scale(0.96);
}

.follow-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

        .follow-btn.following {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--line);
        }

        .follow-btn.following:hover {
          background: rgba(239, 68, 68, 0.04);
          border-color: #ef4444;
          color: #ef4444;
        }

        .action-icon-btn {
          width: 44px;
          height: 44px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: none;
          border: 1px solid var(--line);
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-icon-btn:hover {
          background: rgba(37, 99, 235, 0.04);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .more-menu-wrapper {
          position: relative;
        }

        .more-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 12px;
          min-width: 220px;
          padding: 8px 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 100;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .more-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          background: none;
          border: none;
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .more-menu-item:hover {
          background: rgba(37, 99, 235, 0.04);
        }

        .more-menu-item.danger {
          color: #ef4444;
        }

        .more-menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.06);
        }

        .more-menu-item.warning {
          color: #f59e0b;
        }

        .more-menu-item.warning:hover {
          background: rgba(245, 158, 11, 0.06);
        }

        .profile-stats {
          display: flex;
          align-items: center;
          gap: 32px;
          margin-bottom: 16px;
        }

        .stat-item {
          display: flex;
          flex-direction: row;
          gap: 6px;
          align-items: baseline;
        }

        .stat-number {
          font-weight: 600;
          font-size: 16px;
        }

        .stat-label {
          font-size: 14px;
          color: var(--text-secondary);
          opacity: 0.6;
        }

        .stat-divider {
          width: 1px;
          height: 24px;
          background: var(--line);
        }

        .profile-bio-section {
          max-width: 600px;
        }

        .profile-bio {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .my-businesses-profile-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Posts Container */
        .posts-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Report Textarea */
        .report-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
        }

        .report-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .profile-header {
            padding: 28px 24px;
          }

          .profile-header-left {
            gap: 40px;
          }
        }

        @media (max-width: 968px) {
          .profile-header {
            padding: 24px 20px;
          }

          .profile-header-left {
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }

          .profile-header-info {
            width: 100%;
            text-align: center;
          }

          .profile-name-row {
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }

          .profile-name-wrapper {
            justify-content: center;
          }

          .profile-actions-header {
            margin-left: 0;
            justify-content: center;
            width: 100%;
          }

          .profile-stats {
            justify-content: center;
            gap: 24px;
          }

          .profile-bio-section {
            max-width: 100%;
          }

          .profile-bio {
            text-align: center;
          }

          .more-menu-dropdown {
            right: 50%;
            transform: translateX(50%);
          }
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 12px 0;
            gap: 12px;
          }

          .profile-header {
            padding: 20px 16px;
          }

          .profile-avatar-btn {
            width: 110px;
            height: 110px;
          }

          .profile-avatar-placeholder {
            font-size: 42px;
          }

          .profile-name {
            font-size: 24px;
          }

          .profile-stats {
            gap: 20px;
          }

          .stat-number {
            font-size: 16px;
          }

          .stat-label {
            font-size: 13px;
          }

          .follow-btn {
            padding: 6px 18px;
            font-size: 13px;
          }

          .action-icon-btn {
            width: 40px;
            height: 40px;
          }

          .action-icon-btn svg {
            width: 20px;
            height: 20px;
          }
        }

        @media (max-width: 480px) {
          .profile-page {
            padding: 8px 0;
            gap: 6px;
          }

          .profile-header {
            padding: 16px 12px;
            border-radius: 12px;
          }

          .profile-avatar-btn {
            width: 80px;
            height: 80px;
          }

          .profile-avatar-placeholder {
            font-size: 32px;
          }

          .avatar-upload-badge {
            width: 24px;
            height: 24px;
            bottom: 4px;
            right: 4px;
          }

          .avatar-upload-badge svg {
            width: 12px;
            height: 12px;
          }

          .profile-name {
            font-size: 18px;
          }

          .profile-header-info {
            padding-top: 4px;
          }

          .profile-name-row {
            gap: 8px;
            margin-bottom: 12px;
          }

          .profile-actions-header {
            gap: 8px;
          }

          .follow-btn {
            padding: 5px 14px;
            font-size: 12px;
          }

          .action-icon-btn {
            width: 38px;
            height: 38px;
          }

          .action-icon-btn svg {
            width: 20px;
            height: 20px;
          }

          .profile-stats {
            gap: 16px;
            margin-bottom: 12px;
          }

          .stat-item {
            flex-direction: column;
            align-items: center;
            gap: 2px;
          }

          .stat-divider {
            display: none;
          }

          .stat-number {
            font-size: 14px;
          }

          .stat-label {
            font-size: 11px;
          }

          .profile-bio {
            font-size: 13px;
          }

          .more-menu-dropdown {
            min-width: 180px;
            right: 0;
            transform: none;
            top: calc(100% + 6px);
          }

          .more-menu-item {
            padding: 8px 16px;
            font-size: 13px;
          }

          .more-menu-item svg {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </div>
  );
}