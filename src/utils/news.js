export function stripHtml(value = "") {
  const text = String(value ?? "");
  if (!text) return "";

  try {
    if (typeof window !== "undefined" && window.DOMParser) {
      const doc = new DOMParser().parseFromString(text, "text/html");
      return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    }
  } catch {
    // Fallback below.
  }

  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function summarizeHtml(value = "", maxWords = 28) {
  const text = stripHtml(value);
  if (!text) return "";

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function formatNewsDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return "N/A";
  }
}

export function shareContent({ title, url, text }) {
  const payload = {
    title: title || "ConnectNKT News",
    url: url || (typeof window !== "undefined" ? window.location.href : ""),
    text: text || title || "ConnectNKT News",
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    return navigator.share(payload);
  }

  const fallbackText = [payload.title, payload.url].filter(Boolean).join("\n");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(fallbackText || payload.url || payload.title || "");
  }

  return Promise.resolve();
}
