export default function AdminIconButton({ icon, label, onClick, tone = "default", title }) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-${tone}`}
      onClick={onClick}
      aria-label={label}
      title={title || label}
    >
      {icon}
    </button>
  );
}

