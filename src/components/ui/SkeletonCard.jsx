export default function SkeletonCard() {
  return (
    <div className="card card-pad skeleton-card" role="status" aria-label="Loading content">
      <div className="skeleton-row">
        <div className="skeleton avatar" />
        <div className="skeleton-stack">
          <div className="skeleton line short" />
          <div className="skeleton line tiny" />
        </div>
      </div>
      <div className="skeleton block" />
      <div className="skeleton-pills">
        <div className="skeleton pill" />
        <div className="skeleton pill" />
        <div className="skeleton pill" />
      </div>
    </div>
  );
}
