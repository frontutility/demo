import { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import PostCard from "../../components/cards/PostCard";
import { useApiResource } from "../../api/useApiResource";
import { formatCount } from "../../utils/formatters";

function slugify(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function VillagePage() {
  const { slug } = useParams();
  const { data: villages = [], loading: villagesLoading } = useApiResource("/api/villages", { initialData: [] });
  const { data: users = [], loading: usersLoading } = useApiResource("/api/users", { initialData: [] });
  const { data: posts = [], loading: postsLoading } = useApiResource("/api/posts", { initialData: [] });

  const villageName = useMemo(() => {
    if (villages.length === 0) return "";
    if (!slug) return villages[0].name || villages[0];
    return villages.find((item) => slugify(item.name || item) === slug)?.name || slug.replace(/-/g, " ");
  }, [slug, villages]);

  useEffect(() => {
    if (villageName) {
      document.title = `ConnectNKT | ${villageName}`;
    }
  }, [villageName]);

  if (villagesLoading || usersLoading || postsLoading) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!villages.length) {
    return <EmptyState title="No villages available" message="Villages will appear here once they exist in the database." />;
  }

  const villageUsers = users.filter((item) => String(item.village).toLowerCase() === String(villageName).toLowerCase());
  const villagePosts = posts.filter((post) => {
    const user = users.find((item) => String(item.id) === String(post.userId));
    return String(user?.village).toLowerCase() === String(villageName).toLowerCase();
  });

  if (!villageName) {
    return <EmptyState title="Village not found" message="The requested village could not be found in the database." />;
  }

  return (
    <div className="stack">
      <PageHeader title={villageName} subtitle="Village page with total users, total posts, latest updates, and top contributors." />

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="chip">Total Users: {formatCount(villageUsers.length)}</div>
        <div className="chip">Total Posts: {formatCount(villagePosts.length)}</div>
        <div className="chip">Latest Posts: {villagePosts.length ? "Available" : "No posts yet"}</div>
        <div className="chip">Top Contributors: {villageUsers[0]?.name || "Local voices"}</div>
      </div>

      <SectionCard title="Latest Posts">
        <div className="stack">
          {villagePosts.length ? (
            villagePosts.slice(0, 4).map((post) => (
              <PostCard key={post.id} post={post} user={users.find((item) => String(item.id) === String(post.userId))} compact />
            ))
          ) : (
            <EmptyState title="No posts available" message="This village has no posts yet." />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Top Contributors">
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {villageUsers.length ? (
            villageUsers.map((user) => (
              <div key={user.id} className="chip" style={{ justifyContent: "space-between" }}>
                <span>{user.name}</span>
                <strong>{formatCount(user.followers || 0)} followers</strong>
              </div>
            ))
          ) : (
            <EmptyState title="No users available" message="No users from this village are available yet." />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
