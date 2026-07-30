import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import UserAvatar from "./UserAvatar";

const MENTION_REGEX = /(^|\s)@([^\s@]*)$/;

export default function MentionTextarea({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  className = "",
  textareaClassName = "textarea",
  disabled = false,
}) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState(null);
  const [pendingCursor, setPendingCursor] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mentionRange) {
      setMentionResults([]);
      setDropdownOpen(false);
      setMentionLoading(false);
      return;
    }
    const query = String(mentionQuery || "").trim();

    // If user hasn't typed any character after '@', don't fetch —
    // this avoids loading a default list (could be large) and
    // mirrors Instagram-style behavior (show suggestions after typing).
    if (query.length === 0) {
      setMentionResults([]);
      setDropdownOpen(false);
      setMentionLoading(false);
      return;
    }

    setMentionLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
        const results = Array.isArray(response.data?.data ?? response.data) ? response.data?.data ?? response.data : [];
        setMentionResults(results.slice(0, 10));
        setSelectedIndex(0);
        setDropdownOpen(results.length > 0);
      } catch (error) {
        setMentionResults([]);
        setDropdownOpen(false);
      } finally {
        setMentionLoading(false);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [mentionQuery, mentionRange]);

  useEffect(() => {
    if (pendingCursor !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(pendingCursor, pendingCursor);
      setPendingCursor(null);
    }
  }, [pendingCursor]);

  useEffect(() => {
    if (mentionResults.length === 0) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) => Math.min(current, mentionResults.length - 1));
  }, [mentionResults]);

  function extractMentionState(text, cursor) {
    const prefix = String(text || "").slice(0, cursor);
    const match = prefix.match(MENTION_REGEX);
    if (!match) {
      return { query: "", range: null };
    }

    const token = match[2] ?? "";
    const start = cursor - token.length - 1;
    return { query: token, range: { start, end: cursor } };
  }

  function handleTextareaChange(event) {
    const nextValue = String(event.target.value || "");
    const cursor = event.target.selectionStart ?? nextValue.length;
    const { query, range } = extractMentionState(nextValue, cursor);

    setMentionQuery(query);
    setMentionRange(range);
    if (!range) {
      setDropdownOpen(false);
    }
    onChange(nextValue);
  }

  function insertMention(username) {
    if (!mentionRange) {
      return;
    }

    const prefix = String(value || "").slice(0, mentionRange.start);
    const suffix = String(value || "").slice(mentionRange.end);
    const mentionText = `@${username}`;
    const nextValue = `${prefix}${mentionText} ${suffix}`;

    onChange(nextValue);
    setMentionQuery("");
    setMentionResults([]);
    setMentionRange(null);
    setDropdownOpen(false);
    setPendingCursor(prefix.length + mentionText.length + 1);
  }

  function handleKeyDown(event) {
    if (!dropdownOpen || mentionResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % mentionResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + mentionResults.length) % mentionResults.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      if (mentionResults.length > 0) {
        event.preventDefault();
        insertMention(mentionResults[selectedIndex]?.username || mentionResults[0]?.username);
      }
    } else if (event.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  return (
    <div className={className} ref={wrapperRef} style={{ position: "relative" }}>
      {label ? <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>{label}</label> : null}
      <textarea
        ref={textareaRef}
        className={textareaClassName}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {dropdownOpen && mentionResults.length > 0 ? (
        <div
          className="mention-suggestions"
          style={{
            position: "absolute",
            zIndex: 1000,
            left: 0,
            right: 0,
            marginTop: 8,
            borderRadius: 12,
            background: "var(--surface, #ffffff)",
            border: "1px solid rgba(0, 0, 0, 0.12)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {mentionLoading ? (
            <div className="mention-suggestion-item" style={{ padding: 12, color: "#666" }}>
              Searching...
            </div>
          ) : (
            mentionResults.map((user, index) => (
              <button
                key={user.id || `${user.username}-${index}`}
                type="button"
                className={`mention-suggestion-item ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => insertMention(user.username)}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 12,
                  border: "none",
                  background: index === selectedIndex ? "rgba(59, 130, 246, 0.08)" : "transparent",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <UserAvatar user={user} size={32} />
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    @{user.username}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.name || "Unnamed user"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
