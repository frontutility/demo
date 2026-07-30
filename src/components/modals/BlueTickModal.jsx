import { useEffect, useState } from "react";
import { FiCheck, FiClock, FiInfo, FiXCircle } from "react-icons/fi";
import api from "../../services/api";
import Modal from "./Modal";

export default function BlueTickModal({ open = true, userId, onClose, onSuccess }) {
  const [status, setStatus] = useState("loading");
  const [eligibility, setEligibility] = useState(null);
  const [request, setRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && userId) {
      loadData();
    }
  }, [open, userId]);

  useEffect(() => {
    if (!open) {
      setStatus("loading");
      setEligibility(null);
      setRequest(null);
      setSubmitting(false);
      setError("");
    }
  }, [open]);

  async function loadData() {
    try {
      setStatus("loading");
      setError("");

      const [eligRes, statusRes] = await Promise.all([
        api.get(`/api/users/${userId}/blue-tick/eligibility`),
        api.get(`/api/users/${userId}/blue-tick/status`).catch(() => null),
      ]);

      const eligData = eligRes.data.data || eligRes.data;
      setEligibility(eligData);

      if (statusRes) {
        const statusData = statusRes.data.data || statusRes.data;
        setRequest(statusData);
      }

      setStatus("ready");
    } catch (err) {
      console.error("Failed to load blue tick data:", err);
      setError("Failed to load eligibility information");
      setStatus("error");
    }
  }

  async function handleSubmit() {
    const currFollowers = Number(eligibility?.followers_count ?? 0);
    const minRequired = Number(eligibility?.min_required ?? 500);
    if (!(eligibility?.is_eligible || currFollowers >= minRequired)) return;

    try {
      setSubmitting(true);
      setError("");

      await api.post("/api/blue-tick/requests", {
        user_id: userId,
        request_reason: "I want to verify my ConnectNKT profile.",
        followers_count_snapshot: eligibility.followers_count,
      });

      setRequest({
        followers_count: eligibility.followers_count,
        is_verified: false,
        request_status: "pending",
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const isVerified = eligibility?.is_verified || request?.is_verified || request?.request_status === "approved";
  const isPending = request?.request_status === "pending";
  const isRejected = request?.request_status === "rejected";
  const currentFollowers = Number(eligibility?.followers_count ?? 0);
  const requiredFollowers = Number(eligibility?.min_required ?? 500);
  const isEligible = currentFollowers >= requiredFollowers; // Simplified check
  const remainingFollowers = Math.max(0, requiredFollowers - currentFollowers);
  const progressPercent = requiredFollowers ? Math.min(100, Math.round((currentFollowers / requiredFollowers) * 100)) : 0;

  if (!open) {
    return null;
  }

  if (status === "loading") {
    return (
      <Modal open={open} title="Blue Tick Verification" subtitle="Loading eligibility details..." onClose={onClose} size="sm" variant="info">
        <div style={{ padding: "16px 0", textAlign: "center", color: "#666" }}>Checking your follower status...</div>
      </Modal>
    );
  }

  if (status === "error" || !eligibility) {
    return <Modal open={open} title="Blue Tick Verification" subtitle={error || "Unable to load verification information."} onClose={onClose} size="sm" variant="danger" />;
  }

  const headerSubtitle = isVerified
    ? "You have already been verified with a Blue Tick badge."
    : isPending
    ? "Your request is under review by our team."
    : isRejected
    ? "Your previous request was rejected."
    : `You have ${currentFollowers} out of ${requiredFollowers} required followers. ${isEligible ? 'You are eligible to apply!' : `Need ${remainingFollowers} more followers.`}`;

 return (
  <Modal
    title="Blue Tick Verification"
    subtitle={headerSubtitle}
    open={open}
    onClose={onClose}
    size="sm"
    variant={isVerified ? "success" : isPending ? "warning" : isRejected ? "danger" : "info"}
    icon={isVerified ? <FiCheck /> : isPending ? <FiClock /> : isRejected ? <FiXCircle /> : <FiInfo />}
    actions={
      !isVerified && !isPending && !isRejected ? (
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!isEligible || submitting}
            style={{ 
              opacity: !isEligible ? 0.6 : 1,
              cursor: !isEligible ? "not-allowed" : "pointer"
            }}
          >
            {submitting ? "Applying..." : `Apply for Blue Tick (${currentFollowers}/${requiredFollowers})`}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      )
    }
  >
    {/* Add scrollable container */}
    <div style={{ 
      maxHeight: "60vh", 
      overflowY: "auto", 
      paddingRight: "4px",
      scrollbarWidth: "thin",
      scrollbarColor: "#cbd5e1 transparent"
    }}>
      <div style={{ display: "grid", gap: 18 }}>
        {!isVerified && !isPending && !isRejected ? (
          <>
            {isEligible ? (
              <div style={{ borderRadius: 18, padding: 16, background: "#e8f5e9", border: "1px solid #c8e6c9" }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#2e7d32" }}>✅ You're Eligible!</p>
                <p style={{ margin: "8px 0 0", color: "#2e7d32", fontSize: 14 }}>
                  You have {currentFollowers} followers. You can now apply for the Blue Tick badge.
                </p>
              </div>
            ) : (
              <div style={{ borderRadius: 18, padding: 16, background: "#fff4e5", border: "1px solid #ffd699" }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#92400e" }}>⚠️ Not Eligible Yet</p>
                <p style={{ margin: "8px 0 0", color: "#7c2d12", fontSize: 14 }}>
                  You need {remainingFollowers} more followers to reach the {requiredFollowers} follower requirement.
                </p>
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Followers</p>
                  <p style={{ margin: 0, color: "#111", fontSize: 14 }}>
                    {currentFollowers} / {requiredFollowers}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Progress</p>
                  <p style={{ margin: 0, color: "#111", fontSize: 14 }}>{progressPercent}%</p>
                </div>
              </div>
              <div style={{ width: "100%", height: 12, borderRadius: 9999, background: "#e0e0e0", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: `${progressPercent}%`, 
                    height: "100%", 
                    borderRadius: 9999, 
                    background: progressPercent >= 100 ? "linear-gradient(90deg, #0f766e, #2563eb)" : "#e0e0e0",
                    transition: "width 0.35s ease" 
                  }} 
                />
              </div>
            </div>

            {!isEligible ? (
              <div style={{ borderRadius: 16, padding: 14, background: "#f5f5f5", border: "1px solid #e0e0e0" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                  💡 Tip: Share your profile with friends and engage with the community to grow your followers.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        <div style={{ borderRadius: 16, padding: 16, background: "#f4f8fd", border: "1px solid #dbeafe" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>📌 Note</p>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
            Blue Tick approval is decided by the ConnectNKT team. Having {requiredFollowers} followers makes you eligible to apply, 
            but approval is not guaranteed. Verified badges are reserved for notable, authentic, and community-recognized individuals.
          </p>
          <p style={{ margin: "8px 0 0", color: "#dc2626", fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
            ⚠️ Important: Profiles with excessive reports or those violating ConnectNKT's terms and conditions 
            will not be guaranteed a Blue Tick, regardless of follower count.
          </p>
        </div>

        {error && (
          <div style={{ borderRadius: 14, padding: 12, background: "#ffebee", border: "1px solid #f8bbd0" }}>
            <p style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  </Modal>
);
}
