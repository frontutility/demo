import { FiXCircle } from "react-icons/fi";
import Modal from "./Modal";

export default function ErrorModal({ open, title = "Something went wrong", message, onClose, actions }) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={message}
      onClose={onClose}
      variant="danger"
      icon={<FiXCircle />}
      actions={actions}
    />
  );
}
