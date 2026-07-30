import { useEffect, useMemo } from "react";
import { FiX } from "react-icons/fi";
import PostCard from "../cards/PostCard";
import SearchBar from "../common/SearchBar";
import EmptyState from "../ui/EmptyState";
import SkeletonCard from "../ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import { matchesSearchQuery } from "../../utils/search";

function buildFeedOrder(list) {
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function MobileSearchModal({ open, search, setSearch, onClose }) {
  const { data: posts = [], loading } = useApiResource("/api/posts", { initialData: [] });
  const { data: users = [] } = useApiResource("/api/users", { initialData: [] });

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    if (!open) return undefined;

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const results = useMemo(() => {
    const ordered = buildFeedOrder(posts);
    return ordered.filter((post) => {
      const user = users.find((entry) => String(entry.id) === String(post.userId));
      return matchesSearchQuery(search, [user?.name, user?.username, user?.village, post.category, post.content]);
    });
  }, [posts, search, users]);

  if (!open) return null;

  return (
    <div className="mobile-search-overlay" role="dialog" aria-modal="true" aria-label="Search posts" onClick={() => onClose?.()}>
      <div className="mobile-search-panel glass" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-search-head">
          <strong>Search</strong>
          <button type="button" className="btn btn-ghost" onClick={() => onClose?.()} aria-label="Close search">
            <FiX />
          </button>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, village, or any word" />

        <div className="muted" style={{ fontSize: 13 }}>
          Results are powered by the live posts database.
        </div>

        <div className="mobile-search-results">
          {loading ? (
            <SkeletonCard />
          ) : (
            results.slice(0, 12).map((post) => <PostCard key={post.id} post={post} user={users.find((item) => String(item.id) === String(post.userId))} compact />)
          )}
          {!loading && !results.length && <EmptyState title="No results found" message="Try another name, village, username, or post keyword." />}
        </div>
      </div>
    </div>
  );
}
