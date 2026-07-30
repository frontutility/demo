export default function MaintenancePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        textAlign: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#e2e8f0",
      }}
    >
      <div style={{ fontSize: "64px", marginBottom: "16px" }}>&#x1f6a7;</div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 12px", color: "#f8fafc" }}>
        Website Temporarily Unavailable
      </h1>
      <p style={{ fontSize: "16px", maxWidth: "480px", lineHeight: 1.7, color: "#94a3b8", margin: "0 0 8px" }}>
        We're sorry for the inconvenience.
      </p>
      <p style={{ fontSize: "16px", maxWidth: "480px", lineHeight: 1.7, color: "#94a3b8", margin: "0 0 8px" }}>
        Due to security reasons and essential maintenance, ConnectNKT is temporarily unavailable.
      </p>
      <p style={{ fontSize: "16px", maxWidth: "480px", lineHeight: 1.7, color: "#94a3b8", margin: "0 0 8px" }}>
        Our team is working to restore the service as quickly as possible.
      </p>
      <p style={{ fontSize: "16px", maxWidth: "480px", lineHeight: 1.7, color: "#94a3b8", margin: "0 0 24px" }}>
        Please check back after some time.
      </p>
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
        Thank you for your patience and understanding.
      </p>
    </div>
  );
}