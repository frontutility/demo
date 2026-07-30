export default function AdminToast({ toast }) {
  if (!toast) return null;

  return (
    <div className={`admin-toast ${toast.type || "info"}`}>
      <strong>{toast.title}</strong>
      {toast.message ? <div>{toast.message}</div> : null}
    </div>
  );
}

