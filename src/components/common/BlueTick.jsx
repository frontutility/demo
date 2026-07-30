import { FiCheck } from "react-icons/fi";

export default function BlueTick({ size = 16, style = {} }) {
  return (
    <span
      title="Verified"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        backgroundColor: "#1976d2",
        borderRadius: "50%",
        color: "white",
        flexShrink: 0,
        ...style,
      }}
    >
      <FiCheck size={size - 4} strokeWidth={3} />
    </span>
  );
}
