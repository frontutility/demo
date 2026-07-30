import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { FiPlus } from "react-icons/fi";
import { useNavigate, useOutletContext } from "react-router-dom";
import PostCard from "../../components/cards/PostCard";
import UserSuggestionsCarousel from "../../components/cards/UserSuggestionsCarousel";
import SearchBar from "../../components/common/SearchBar";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import { matchesSearchQuery } from "../../utils/search";
import api from "../../services/api";

export default function HomePage() {
  const { search, setSearch } = useOutletContext();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedSeed] = useState(() => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  const sentinelRef = useRef(null);
  const [category, setCategory] = useState("All");
  const [villageId, setVillageId] = useState("All");
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const { data: villages = [], loading: villagesLoading } = useApiResource("/api/villages", { initialData: [] });
  const { data: posts = [], loading: postsLoading } = useApiResource(`/api/feed/ranked?limit=60&seed=${feedSeed}`, { initialData: [] });
  const { data: users = [], loading: usersLoading } = useApiResource("/api/users", { initialData: [] });
  const { data: categories = [] } = useApiResource("/api/post-categories", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT | Home";
  }, []);

  const feed = useMemo(() => {
    return (Array.isArray(posts) ? posts : []).filter((post) => {
      const author = users.find((entry) => String(entry.id) === String(post.userId));
      const searchMatch = matchesSearchQuery(search, [author?.name, author?.username, author?.village, post.category, post.content]);
      const categoryMatch = category === "All" || post.category === category;

      const candidates = [
        post.village_id,
        post.villageId,
        post.village,
        post.village_name,
        post.villageName,
        (post.user && post.user.village_id) || null,
        (post.user && post.user.villageId) || null,
        (author && author.village_id) || null,
        (author && author.villageId) || null,
      ];

      const postVillageId = String(candidates.find((c) => c !== undefined && c !== null && String(c) !== "") ?? "");
      const villageMatch = villageId === "All" || postVillageId === String(villageId);

      return searchMatch && categoryMatch && villageMatch;
    });
  }, [category, posts, search, users, villageId]);

  // Create augmented feed with suggestions inserted at intervals
  const augmentedFeed = useMemo(() => {
    if (!settings.enableSuggestions || !user.loggedIn) {
      return feed.map((post) => ({ type: "post", post }));
    }

    const augmented = [];
    const interval = Number(settings.suggestionsInterval) || 15;
    let lastSuggestionIndex = -1;
    let suggestionsAdded = 0;

    for (let i = 0; i < feed.length; i++) {
      augmented.push({ type: "post", post: feed[i] });

      // Check if we should insert a suggestion after this post
      if (
        i >= interval &&
        i - lastSuggestionIndex >= interval &&
        suggestionsAdded === 0 // Only insert one set of suggestions per page
      ) {
        augmented.push({ type: "suggestions" });
        lastSuggestionIndex = i;
        suggestionsAdded++;
      }
    }

    return augmented;
  }, [feed, settings.enableSuggestions, settings.suggestionsInterval, user.loggedIn]);

  const loading = postsLoading || usersLoading;
  const canLoadMore = !loading && !loadingMore && visible < feed.length;

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    setLoadingMore(true);
    setVisible((v) => Math.min(feed.length, v + 10));
    setTimeout(() => setLoadingMore(false), 450);
  }, [canLoadMore, feed.length]);

  useInfiniteScroll({ sentinelRef, canLoadMore, onLoadMore: handleLoadMore });

  return (
    <div className="stack">
      <SectionCard>
        <div className="feed-header-bar">
          <div className="feed-search-wrap">
            <SearchBar
              value={search}
              onChange={(val) => setSearch(val)}
              onClick={() => navigate("/search")}
              placeholder="Search by name, username, village, or category..."
            />
          </div>
          <button
            className="btn btn-primary feed-create-btn"
            type="button"
            onClick={() => (user?.loggedIn ? navigate("/post/new") : navigate("/login"))}
          >
            <FiPlus size={16} /> Create Post
          </button>
        </div>
      </SectionCard>

      <SectionCard
        action={
          <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
            <select
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={{ flex: 1 }}
            >
              <option value="All">All Category</option>
              {categories.map((item) => (
                <option key={item.id || item.name || item} value={item.name || item}>
                  {item.name || item}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="All">All Villages</option>
              {villages.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
                }
          >
        <div className="stack">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            augmentedFeed.slice(0, visible).map((item, index) => {
              if (item.type === "suggestions") {
                return (
                  <UserSuggestionsCarousel key="suggestions" maxCards={settings.suggestionsCount} />
                );
              }
              return (
                <FeedPost key={item.post.id} post={item.post} user={users.find((user) => String(user.id) === String(item.post.userId))} trackSeen={Boolean(user?.loggedIn)} />
              );
            })
          )}
          {!loading && !feed.length && (
            <EmptyState title="No matching posts" message="Try a different username, village, or category filter to see more of the town feed." />
          )}
          {visible < feed.length && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              {loadingMore ? (
                <div style={{ padding: 12 }}>
                  <div className="spinner" aria-hidden="true" />
                </div>
              ) : (
                <div ref={sentinelRef} style={{ width: "100%", height: 1 }} />
              )}
            </div>
          )}
          {visible >= feed.length && feed.length > 0 && (
            <div style={{ textAlign: "center", color: "#666", padding: 12 }}>No More Posts</div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function FeedPost({ post, user, trackSeen }) {
  const elementRef = useRef(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!trackSeen || !post?.id || !elementRef.current || hasTrackedRef.current) return undefined;

    const markSeen = () => {
      if (hasTrackedRef.current) return;
      hasTrackedRef.current = true;
      api.post(`/api/posts/${post.id}/seen`).catch(() => {
        // Feed tracking must never interrupt reading if the request is unavailable.
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      markSeen();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          markSeen();
          observer.disconnect();
        }
      },
      { threshold: 0.45 }
    );
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [post?.id, trackSeen]);

  return (
    <div ref={elementRef}>
      <PostCard post={post} user={user} />
    </div>
  );
}

// IntersectionObserver setup for infinite loading
function useInfiniteScroll({ sentinelRef, canLoadMore, onLoadMore }) {
  useEffect(() => {
    if (!sentinelRef?.current || !canLoadMore) return undefined;

    let observer = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              onLoadMore();
            }
          });
        },
        { root: null, rootMargin: "200px", threshold: 0.01 }
      );
      observer.observe(sentinelRef.current);
    } catch (err) {
      // IntersectionObserver not supported; no-op
    }

    return () => {
      if (observer && observer.disconnect) observer.disconnect();
    };
  }, [sentinelRef, canLoadMore, onLoadMore]);
}

// Attach infinite scroll behavior in component scope
// (placed after component to keep top-level component concise)
