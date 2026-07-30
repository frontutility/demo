import AdminModal from "./AdminModal";

export default function AdminConfirmationModal({
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
    <AdminModal
      open={open}
      title={title || "Confirm action"}
      subtitle={message}
      onClose={onClose}
      size="md"
      actions={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="btn btn-primary" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </>
      }
    />
  );
}
