export function formatDate(dateValue) {
  if (dateValue === null || dateValue === undefined || dateValue === "") {
    return "N/A";
  }

  const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export function formatCount(value) {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
    return "0";
  }

  const num = Number(value);

  if (num < 0) {
    return "0";
  }

  if (num < 1000) {
    return String(Math.floor(num));
  }

  const suffixes = [
    { threshold: 1e9, suffix: "B" },
    { threshold: 1e6, suffix: "M" },
    { threshold: 1e3, suffix: "K" },
  ];

  for (const { threshold, suffix } of suffixes) {
    if (num >= threshold) {
      const formatted = num / threshold;
      const rounded = Math.round(formatted * 10) / 10;
      return rounded % 1 === 0 ? `${Math.floor(rounded)}${suffix}` : `${rounded}${suffix}`;
    }
  }

  return String(Math.floor(num));
}

export function clampWords(text, maxWords = 250) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
}
