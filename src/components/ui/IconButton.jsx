export default function IconButton({ icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 44,
        height: 44,
        padding: 0,
        borderRadius: 14,
        borderColor: active ? "var(--brand)" : "var(--line)",
        color: active ? "var(--brand)" : "var(--text)",
      }}
    >
      {icon}
    </button>
  );
}
