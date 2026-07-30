import { FiCheckCircle } from "react-icons/fi";
import Modal from "./Modal";

export default function SuccessModal({ open, title = "Success", message, onClose, actions }) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={message}
      onClose={onClose}
      variant="success"
      icon={<FiCheckCircle />}
      actions={actions}
    />
  );
}
