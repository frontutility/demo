export function normalizeUsername(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

export function validateUsername(username) {
  const value = String(username ?? "");
  if (!value) return "Username is required.";
  if (value.length < 3) return "Username must be at least 3 characters.";
  if (value.length > 30) return "Username cannot exceed 30 characters.";
  if (!/^[a-z0-9_.]+$/.test(value)) return "Username may contain only letters, numbers, underscores, and dots.";
  if (value.includes("..") || value.includes("__")) return "Username cannot contain consecutive dots or underscores.";
  if (/^[._]|[._]$/.test(value)) return "Username cannot start or end with a dot or underscore.";
  return "";
}
