import { FiAlertTriangle } from "react-icons/fi";
import Modal from "./Modal";

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      title={title || "Confirm action"}
      subtitle={message}
      onClose={onClose}
      variant="warning"
      icon={<FiAlertTriangle />}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </>
      }
    />
  );
}
