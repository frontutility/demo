import { useEffect, useState } from "react";
import { getInitials, getUserAvatarUrl } from "../../utils/profile";

export default function UserAvatar({ user = {}, name = "", size = 40, className = "", style = {}, alt = "" }) {
  const avatarUrl = getUserAvatarUrl(user);
  const displayName = name || user?.name || user?.username || "User";
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    flex: "none",
    background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
    color: "#fff",
    fontWeight: 800,
    letterSpacing: "0.02em",
    ...style,
  };

  if (avatarUrl && !imageError) {
    return (
      <span className={className} style={baseStyle}>
        <img
          src={avatarUrl}
          alt={alt || displayName}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(event) => {
            event.currentTarget.style.display = "none";
            setImageError(true);
          }}
        />
      </span>
    );
  }

  return (
    <span className={className} style={baseStyle} aria-label={alt || displayName}>
      {getInitials(displayName)}
    </span>
  );
}
