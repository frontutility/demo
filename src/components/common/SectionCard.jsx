export default function SectionCard({ title, children, action, className = "" }) {
  return (
    <section className={`card card-pad ${className}`.trim()}>
      {(title || action) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
          }}
        >
          {title ? <h2 className="section-title" style={{ margin: 0 }}>{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
