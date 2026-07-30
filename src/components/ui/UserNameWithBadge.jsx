import { Link } from "react-router-dom";
import { HiBadgeCheck } from "react-icons/hi";
import { getProfilePath } from "../../utils/profile";

export default function UserNameWithBadge({
  user,
  name,
  username,
  verified,
  showAt = false,
  link = true,
  className = "",
  badgeSize = 16,
  showBadge = true,
  ...props
}) {
  const resolvedUser = user || {};
  const displayName = name ?? (showAt ? resolvedUser.username : resolvedUser.name) ?? resolvedUser.username ?? "User";
  const text = showAt && displayName && !String(displayName).startsWith("@") ? `@${displayName}` : displayName;
  const isVerified = Boolean(showBadge && (verified ?? String(resolvedUser.blue_tick_status || resolvedUser.blueTick || "") === "verified"));
  const content = (
    <>
      <span>{text}</span>
      {isVerified && <HiBadgeCheck className="username-badge-icon" color="#2563eb" size={badgeSize} title="Verified" />}
    </>
  );

  const classes = `username-with-badge ${className}`.trim();
  if (!link) {
    return <span className={classes} {...props}>{content}</span>;
  }

  return (
    <Link to={getProfilePath(resolvedUser)} className={classes} {...props}>
      {content}
    </Link>
  );
}
