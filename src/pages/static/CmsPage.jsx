import { useEffect } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useApiResource } from "../../api/useApiResource";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

export default function CmsPage({ slug }) {
  const params = useParams();
  const pageSlug = slug || params.slug;
  const { data: page, loading, error } = useApiResource(pageSlug ? `/api/cms/pages/${pageSlug}` : null, {
    initialData: null,
  });

  useEffect(() => {
    if (page?.title) {
      document.title = `ConnectNKT | ${page.title}`;
    }
  }, [page?.title]);

  if (loading) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !page || !page.title) {
    return (
      <div className="stack">
        <PageHeader title="Page Not Found" subtitle={`No CMS page was found for "${pageSlug}"."`} />
        <EmptyState title={error || "Page not found"} message="The requested content is not available right now." />
      </div>
    );
  }

  const pageTitle = page.title;
  const pageSubtitle = pageTitle ? `Learn more about ${String(pageTitle).toLowerCase()}.` : "Learn more about this page.";

  return (
    <div className="stack">
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />
      <SectionCard className="max-w-4xl mx-auto">
        <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
      </SectionCard>
    </div>
  );
}
