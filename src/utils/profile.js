export function getInitials(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "NA";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function getNavbarUsername(name = "") {
  const s = String(name || "").trim();
  if (!s) return "";

  const parts = s.split(/\s+/).filter(Boolean);

  // If multiple words: first letter of first + first letter of second (both uppercase)
  if (parts.length >= 2) {
    const a = (parts[0][0] || "").toUpperCase();
    const b = (parts[1][0] || "").toUpperCase();
    return (a + b).slice(0, 2);
  }

  // Single word: first char uppercase, second char lowercase (if exists)
  const first = parts[0].charAt(0).toUpperCase();
  const second = parts[0].charAt(1) ? parts[0].charAt(1).toLowerCase() : "";
  return (first + second).slice(0, 2);
}

function getApiBase() {
  return String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export function resolveMediaUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;

  const normalized = raw.replace(/^\/+/, "");
  const apiBase = getApiBase();
  if (!apiBase) {
    return `/${normalized}`;
  }

  try {
    const apiPath = new URL(apiBase).pathname.replace(/\/+$/, "");
    if (raw.startsWith(apiPath + "/")) {
      return `${apiBase}/${raw.slice(apiPath.length + 1)}`;
    }
  } catch (error) {
    // Fall back to the plain join below.
  }

  return `${apiBase}/${normalized}`;
}

export function getUserAvatarUrl(user = {}) {
  const value =
    user?.avatar_url ??
    user?.avatarUrl ??
    user?.profile_image_url ??
    user?.profileImageUrl ??
    user?.profile_image ??
    user?.profileImage ??
    user?.photo ??
    user?.image ??
    user?.userProfileImageUrl ??
    user?.user_profile_image_url ??
    "";

  return resolveMediaUrl(value);
}

export function getProfilePath(user = {}) {
  const username = String(user?.username || "").trim();
  if (username) {
    return `/profile/${encodeURIComponent(username)}`;
  }

  const id = String(user?.id || "").trim();
  return id ? `/profile/${encodeURIComponent(id)}` : "/profile";
}

export function slugifyText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPostSlug(post = {}, author = {}) {
  const username = String(author?.username || post?.user_username || post?.username || "").trim();
  const contentSlug = slugifyText(post?.slug || post?.content || post?.title || "");
  if (username && contentSlug) {
    return `${slugifyText(username)}-${contentSlug}`;
  }
  if (contentSlug) {
    return contentSlug;
  }
  return String(post?.id || "").trim();
}

export function getPostPath(post = {}, author = {}) {
  // Prefer numeric id when present to avoid slug lookup mismatches on navigation.
  const id = String(post?.id || post?.postId || "").trim();
  if (id && /^\d+$/.test(id)) {
    return `/post/${encodeURIComponent(id)}`;
  }

  const slug = buildPostSlug(post, author);
  return slug ? `/post/${encodeURIComponent(slug)}` : "/post";
}
