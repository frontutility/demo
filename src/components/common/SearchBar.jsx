import { FiSearch } from "react-icons/fi";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search people, villages, categories...",
  onClick,
  readOnly = false,
}) {
  return (
    <label
      className="search-shell glass"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "3px 12px",
        borderRadius: 8,
        minWidth: 0,
        cursor: onClick ? "pointer" : "text",
      }}
      onClick={onClick}
    >
      <span className="search-icon">
        <FiSearch />
      </span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="search-input"
        readOnly={readOnly}
      />
      <button type="button" className="search-chip">
        Search
      </button>
    </label>
  );
}
