import { FiX } from "react-icons/fi";

export default function AdminModal({ open, title, subtitle, children, actions, onClose, size = "md" }) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`admin-modal admin-modal-${size}`} onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {actions ? <div className="admin-modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

