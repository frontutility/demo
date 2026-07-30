export default function PageHeader({ title, subtitle, action }) {
  return (
    <div
      className="card card-pad"
      style={{
        display: "flex",
        alignItems: "start",
        justifyContent: "space-between",
        gap: 8,
        padding: "16px 20px", // Reduced padding
        marginBottom: 0, // Remove bottom margin
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.2rem, 1.8vw, 2rem)" }}>{title}</h1>
        <div className="muted" style={{ marginTop: 4, maxWidth: 760, lineHeight: 1.4, fontSize: "0.9rem" }}>
          {subtitle}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  );
}