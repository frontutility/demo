import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiLoader, FiShield, FiTrash2 } from "react-icons/fi";
import Modal from "./Modal";
import api from "../../services/api";

const deleteReasons = [
  "I don't use ConnectNKT anymore",
  "I created another account",
  "Privacy concerns",
  "Too many notifications",
  "I found a better platform",
  "I have technical issues",
  "I don't feel safe here",
  "Other",
];

const stepTitles = [
  "Delete your account",
  "Tell us why",
  "Review before you continue",
  "Confirm one last time",
  "Delete account",
];

export default function AccountDeletionModal({ open, userId, onClose, onDeleted }) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const resetState = () => {
    setStep(1);
    setReason("");
    setCustomReason("");
    setConfirmationText("");
    setLoading(false);
    setError("");
    setCsrfToken("");
    setIsComplete(false);
  };

  useEffect(() => {
    if (!open) return;
    resetState();
    if (!userId) {
      setError("You need to be signed in to delete your account.");
      return;
    }

    api
      .get("/api/auth/csrf-token")
      .then((response) => {
        const nextToken = response?.data?.data?.token ?? response?.data?.token ?? "";
        setCsrfToken(nextToken);
        if (!nextToken) {
          setError("Could not initialize the secure delete request.");
        }
      })
      .catch(() => {
        setError("Could not initialize the secure delete request.");
      });
  }, [open, userId]);

  const canContinue = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) {
      if (!reason) return false;
      if (reason === "Other") {
        return customReason.trim().length > 0 && customReason.trim().length <= 80;
      }
      return true;
    }
    if (step === 3) return true;
    if (step === 4) return confirmationText === "DELETE";
    return true;
  }, [confirmationText, customReason, reason, step]);

  function handleClose() {
    if (loading) return;
    resetState();
    onClose?.();
  }

  function handleNext() {
    setError("");

    if (step === 2) {
      if (!reason) {
        setError("Please select a reason before continuing.");
        return;
      }
      if (reason === "Other") {
        const trimmed = customReason.trim();
        if (!trimmed) {
          setError("Please provide a reason before continuing.");
          return;
        }
        if (trimmed.length > 80) {
          setError("Custom reason must be 80 characters or fewer.");
          return;
        }
      }
      setStep(3);
      return;
    }

    if (step === 4) {
      if (confirmationText !== "DELETE") {
        setError("Please type DELETE exactly to continue.");
        return;
      }
      setStep(5);
      return;
    }

    setStep((current) => Math.min(5, current + 1));
  }

  async function handleDelete() {
    if (!userId) {
      setError("You need to be signed in to delete your account.");
      return;
    }
    if (!csrfToken) {
      setError("Security token is not ready. Please refresh and try again.");
      return;
    }
    if (confirmationText !== "DELETE") {
      setError("Please type DELETE exactly to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post(
        `/api/users/${userId}/delete-account`,
        {
          delete_reason: reason,
          custom_reason: reason === "Other" ? customReason.trim() : "",
          confirmation_text: confirmationText,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
            "X-Csrf-Token": csrfToken,
          },
        }
      );

      setIsComplete(true);
      setTimeout(() => {
        onClose?.();
        onDeleted?.();
      }, 3000);
    } catch (errorPayload) {
      setError(errorPayload?.response?.data?.message || errorPayload?.message || "We could not delete your account right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isComplete ? "Account deleted" : stepTitles[step - 1]}
      subtitle={isComplete ? "Your account has been permanently deleted. You will be redirected shortly." : "This process is permanent and cannot be undone."}
      variant="warning"
      size="lg"
      icon={isComplete ? <FiShield /> : <FiTrash2 />}
      actions={
        <div className="account-delete-actions">
          {step > 1 && step < 5 && !isComplete ? (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={loading}>
              <FiArrowLeft /> Back
            </button>
          ) : null}
          {step < 5 && !isComplete ? (
            <button type="button" className="btn btn-primary" onClick={handleNext} disabled={!canContinue || loading}>
              Continue <FiArrowRight />
            </button>
          ) : null}
          {step === 5 && !isComplete ? (
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading || !canContinue}>
              {loading ? <><FiLoader className="spin" /> Deleting...</> : "Delete Permanently"}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="account-delete-flow">
        <div className="step-indicator">
          <span>Step {step} of 5</span>
        </div>

        {error ? <div className="flow-error">{error}</div> : null}

        {step === 1 && (
          <div className="flow-step-content">
            <div className="flow-warning-box">
              <FiAlertTriangle size={22} />
              <div>
                <h4>Deleting your account is permanent.</h4>
                <p>Before continuing, please note that the following data will be removed:</p>
              </div>
            </div>
            <ul className="flow-list">
              <li>All posts will be removed.</li>
              <li>All comments will be removed.</li>
              <li>Likes and reactions will be removed.</li>
              <li>Followers and following connections will be removed.</li>
              <li>Messages will be deleted according to the existing delete logic.</li>
              <li>Profile information will be removed.</li>
              <li>Your username cannot be recovered.</li>
              <li>This action cannot be undone.</li>
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="flow-step-content">
            <h4>Select a reason</h4>
            <p className="flow-help">Choose one reason before continuing.</p>
            <div className="reason-list">
              {deleteReasons.map((option) => (
                <label key={option} className={`reason-option ${reason === option ? "active" : ""}`}>
                  <input type="radio" name="delete_reason" value={option} checked={reason === option} onChange={() => setReason(option)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {reason === "Other" ? (
              <div className="field-group">
                <label htmlFor="delete-custom-reason">Custom reason</label>
                <textarea
                  id="delete-custom-reason"
                  className="field"
                  rows="3"
                  maxLength={80}
                  value={customReason}
                  onChange={(event) => setCustomReason(event.target.value)}
                  placeholder="Tell us more (max 80 characters)"
                />
                <div className="field-hint">{customReason.length}/80 characters</div>
              </div>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="flow-step-content">
            <h4>Final summary</h4>
            <p className="flow-help">Deleting this account will permanently remove the following:</p>
            <ul className="flow-list compact">
              <li>Profile</li>
              <li>Posts</li>
              <li>Comments</li>
              <li>Likes</li>
              <li>Followers</li>
              <li>Following</li>
              <li>Saved data, if available</li>
              <li>Personal information</li>
            </ul>
            <div className="summary-box">
              <strong>Selected reason:</strong> {reason || "Not selected"}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flow-step-content">
            <h4>Confirm deletion</h4>
            <p className="flow-help">For extra security, please type DELETE exactly as shown below.</p>
            <input
              className="field"
              type="text"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder="Type DELETE"
              autoComplete="off"
            />
          </div>
        )}

        {step === 5 && !isComplete && (
          <div className="flow-step-content">
            <div className="flow-warning-box">
              <FiAlertTriangle size={22} />
              <div>
                <h4>This action cannot be undone.</h4>
                <p>Your account and associated content will be removed permanently.</p>
              </div>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="flow-step-content success-state">
            <FiShield size={48} />
            <h4>Your account has been permanently deleted.</h4>
            <p>Thank you for being part of ConnectNKT. You will be redirected to the home page in a moment.</p>
          </div>
        )}
      </div>

      <style>{`
        .account-delete-flow {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 60vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        
        /* Custom scrollbar for better UX */
        .account-delete-flow::-webkit-scrollbar {
          width: 6px;
        }
        .account-delete-flow::-webkit-scrollbar-track {
          background: transparent;
        }
        .account-delete-flow::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.3);
          border-radius: 10px;
        }
        .account-delete-flow::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.5);
        }
        
        .step-indicator {
          display: inline-flex;
          align-self: flex-start;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .flow-error {
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.18);
          font-size: 14px;
          flex-shrink: 0;
        }
        .flow-step-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }
        .flow-warning-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: 12px;
          background: rgba(248, 113, 113, 0.12);
          color: var(--text);
          border: 1px solid rgba(248, 113, 113, 0.2);
        }
        .flow-warning-box h4,
        .flow-step-content h4 {
          margin: 0 0 4px;
          font-size: 17px;
        }
        .flow-help {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .flow-list {
          margin: 0;
          padding-left: 18px;
          color: var(--text);
          display: grid;
          gap: 6px;
        }
        .flow-list.compact {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .summary-box {
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--bg-soft);
          color: var(--text);
        }
        .reason-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .reason-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg-soft);
          cursor: pointer;
          transition: all 180ms ease;
        }
        .reason-option.active {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        .reason-option input {
          accent-color: #ef4444;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .field {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--bg-solid);
          color: var(--text);
          padding: 10px 12px;
          box-sizing: border-box;
        }
        .field-hint {
          color: var(--text-secondary);
          font-size: 12px;
          text-align: right;
        }
        .account-delete-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .btn-danger {
          background: #dc2626;
          color: #fff;
          border: none;
        }
        .btn-danger:hover {
          background: #b91c1c;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .success-state {
          align-items: center;
          text-align: center;
          padding: 12px 0 4px;
          color: var(--text);
        }
        
        @media (max-width: 640px) {
          .account-delete-flow {
            max-height: 50vh;
          }
          .flow-list.compact {
            grid-template-columns: 1fr;
          }
          .account-delete-actions {
            flex-direction: column-reverse;
          }
          .account-delete-actions button {
            width: 100%;
          }
        }
      `}</style>
    </Modal>
  );
}