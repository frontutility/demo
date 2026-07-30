export default function LoadingScreen() {
  return (
    <div className="loading-screen-shell">
      <div className="loading-container">
        {/* Brand Name */}
        <div className="loading-brand">
          <span className="brand-text">ConnectNKT</span>
        </div>

        {/* Spinner */}
        <div className="loading-spinner">
          <div className="spinner-ring" />
        </div>

        {/* Status */}
        <p className="loading-status">Just a moment...</p>
      </div>

      <style>{`
        .loading-screen-shell {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-solid);
          z-index: 9999;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .loading-brand {
          margin-bottom: 8px;
        }

        .brand-text {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
        }

        .spinner-ring {
          width: 100%;
          height: 100%;
          border: 3px solid var(--line);
          border-top-color: var(--brand-2);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-status {
          font-size: 14px;
          color: var(--text-secondary);
          opacity: 0.7;
          margin: 0;
          animation: pulseText 1.5s ease-in-out infinite;
        }

        @keyframes pulseText {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}