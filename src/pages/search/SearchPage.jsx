import { useEffect, useMemo } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import UserAvatar from "../../components/ui/UserAvatar";
import UserNameWithBadge from "../../components/ui/UserNameWithBadge";
import { useApiResource } from "../../api/useApiResource";
import { matchesSearchQuery } from "../../utils/search";
import { getProfilePath, getPostPath } from "../../utils/profile";

export default function SearchPage() {
  const { search: query, setSearch: setQuery } = useOutletContext();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "latest";
  const { data: users = [], loading: usersLoading } = useApiResource("/api/users", { initialData: [] });
  const { data: posts = [], loading: postsLoading } = useApiResource("/api/posts", { initialData: [] });

  const userList = Array.isArray(users) ? users : [];
  const postList = Array.isArray(posts) ? posts : [];

  useEffect(() => {
    document.title = "ConnectNKT | Search";
  }, []);

  const matchedPeople = useMemo(() => {
    return userList.filter((user) => {
      const userPosts = postList.filter((post) => String(post.userId) === String(user.id));
      const postTerms = userPosts.map((post) => `${post.category} ${post.content}`);
      return matchesSearchQuery(query, [user.name, user.username, user.village, ...postTerms]);
    });
  }, [postList, query, userList]);

  const filteredPosts = useMemo(() => {
    const searchMatches = postList.filter((post) => {
      const user = userList.find((item) => String(item.id) === String(post.userId));
      return matchesSearchQuery(query, [user?.name, user?.username, user?.village, post.category, post.content]);
    });

    if (tab === "trending") {
      return searchMatches.slice().sort((a, b) => (b.agrees || 0) - (a.agrees || 0)).slice(0, 10);
    }

    return searchMatches.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  }, [posts, query, tab, users]);

  const loading = usersLoading || postsLoading;

  return (
    <div className="stack">
      <SectionCard title="Search People">
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type name, username, village, or category..." autoFocus />
      </SectionCard>

      {query.trim() ? (
        <SectionCard title={`People (${matchedPeople.length})`}>
          <div className="stack">
            {matchedPeople.map((user) => (
              <Link key={user.id} to={getProfilePath(user)} className="search-person-row">
                <UserAvatar user={user} name={user.name} size={44} className="search-person-avatar" />
                <div style={{ minWidth: 0 }}>
                  <UserNameWithBadge user={user} name={user.name} link={false} style={{ fontWeight: 800 }} />
                  <div className="muted" style={{ fontSize: 13 }}>
                    <UserNameWithBadge user={user} name={user.username} showAt link={false} showBadge={false} /> - {user.village}
                  </div>
                </div>
              </Link>
            ))}
            {!matchedPeople.length && <EmptyState title="No people found" message="Try another name, username, village, or category hint." />}
          </div>
        </SectionCard>
      ) : (
        <EmptyState title="Start typing" message="Search by name, username, village, or category. Matching people will appear instantly." />
      )}

      <SectionCard title={tab === "trending" ? "Trending Posts" : "Latest Posts"}>
        <div className="stack">
          {loading ? (
            <SkeletonCard />
          ) : (
            filteredPosts.map((post) => (
              <Link key={post.id} to={getPostPath(post, userList.find((item) => String(item.id) === String(post.userId)))} className="search-person-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{post.category}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {post.content.slice(0, 80)}
                    {post.content.length > 80 ? "..." : ""}
                  </div>
                </div>
              </Link>
            ))
          )}
          {!loading && !filteredPosts.length && <EmptyState title={tab === "trending" ? "No trending posts" : "No latest posts"} message="Try a different search or remove filters to see posts." />}
        </div>
      </SectionCard>
    </div>
  );
}
