import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({
  open,
  title,
  subtitle,
  children,
  actions,
  onClose,
  variant = "default",
  size = "md",
  icon,
}) {
  useEffect(() => {
    if (!open || !onClose) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`modal-card modal-card-${size} modal-variant-${variant}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-text">
            {icon ? <div className="modal-icon">{icon}</div> : null}
            <div>
              {title ? <h3 className="modal-title">{title}</h3> : null}
              {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body
  );
}
