import { useEffect, useState } from "react";

function isInstalled() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isInstalled());
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!promptEvent) {
      setMessage("Use your browser menu to install or add this app to your home screen.");
      return;
    }

    await promptEvent.prompt();
    setPromptEvent(null);
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="action-btn" type="button" onClick={install}>
        Download App
      </button>
      {message && (
        <span role="status" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 230, padding: "8px 10px", borderRadius: 8, background: "var(--bg-solid)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", fontSize: 12, zIndex: 50 }}>
          {message}
        </span>
      )}
    </div>
  );
}
