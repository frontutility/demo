export default function StatCard({ label, value, tone = "info" }) {
  return (
    <div className="card card-pad" style={{ display: "grid", gap: 8 }}>
      <div className={`status ${tone}`}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
