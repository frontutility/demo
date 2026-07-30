import { FiInfo } from "react-icons/fi";
import Modal from "./Modal";

export default function InfoModal({ open, title = "Information", message, onClose, actions }) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={message}
      onClose={onClose}
      variant="info"
      icon={<FiInfo />}
      actions={actions}
    />
  );
}
