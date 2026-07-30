export default function EmptyState({ title, message, action }) {
  return (
    <div className="card card-pad" style={{ textAlign: "center", paddingBlock: 34 }}>
      <div style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: 8 }}>{title}</div>
      <div className="muted" style={{ maxWidth: 520, margin: "0 auto 18px" }}>
        {message}
      </div>
      {action}
    </div>
  );
}
