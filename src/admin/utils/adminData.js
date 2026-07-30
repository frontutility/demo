import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { summarizeHtml } from "../../utils/news";

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.rows)) return value.rows;
  return [];
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9@._\-\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBoolFlag(value) {
  return [1, "1", true, "true", "yes", "on"].includes(value);
}

export function matchesSearchQuery(query, values = []) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const haystack = normalizeSearchText(values.flat().filter(Boolean).join(" "));
  return haystack.includes(needle);
}

export function normalizeUser(user = {}) {
  const village = user.village && typeof user.village === "object" ? user.village.name || user.village.slug || "" : user.village || user.village_name || "";
  const followers = user.followers_count ?? user.followers ?? 0;
  const following = user.following_count ?? user.following ?? 0;
  const posts = user.posts_count ?? user.posts ?? 0;
  const comments = user.comments_count ?? user.comments ?? 0;
  const agrees = user.agree_count ?? user.agrees_count ?? user.agrees ?? 0;
  const disagrees = user.disagree_count ?? user.disagrees_count ?? user.disagrees ?? 0;
  const shares = user.shares_count ?? user.shares ?? 0;
  const showInSearch = user.show_in_search ?? user.showInSearch ?? 1;
  const canCreateTextPost = toBoolFlag(user.can_create_text_post ?? user.canCreateTextPost ?? 1);
  const canCreatePollPost = toBoolFlag(user.can_create_poll_post ?? user.canCreatePollPost ?? 1);
  const canCreateImagePost = toBoolFlag(user.can_create_image_post ?? user.canCreateImagePost ?? 0);
  const canCreateImageTextPost = toBoolFlag(user.can_create_image_text_post ?? user.canCreateImageTextPost ?? 0);

  return {
    ...user,
    id: user.id ?? user.user_id ?? null,
    name: user.name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    mobile: user.mobile ?? user.phone ?? "",
    bio: user.bio ?? "",
    profileImageUrl: user.profile_image_url ?? user.profileImageUrl ?? user.avatar_url ?? user.avatar ?? "",
    village,
    villageId: user.village_id ?? user.villageId ?? null,
    villageName: village,
    followers: Number(followers) || 0,
    following: Number(following) || 0,
    posts: Number(posts) || 0,
    comments: Number(comments) || 0,
    agreeCount: Number(agrees) || 0,
    disagreeCount: Number(disagrees) || 0,
    shares: Number(shares) || 0,
    can_create_text_post: Boolean(canCreateTextPost),
    canCreateTextPost: Boolean(canCreateTextPost),
    can_create_poll_post: Boolean(canCreatePollPost),
    canCreatePollPost: Boolean(canCreatePollPost),
    can_create_image_post: Boolean(canCreateImagePost),
    canCreateImagePost: Boolean(canCreateImagePost),
    can_create_image_text_post: Boolean(canCreateImageTextPost),
    canCreateImageTextPost: Boolean(canCreateImageTextPost),
    followersCountOverride: user.followers_count_override ?? user.followersCountOverride ?? null,
    followingCountOverride: user.following_count_override ?? user.followingCountOverride ?? null,
    postsCountOverride: user.posts_count_override ?? user.postsCountOverride ?? null,
    commentsCountOverride: user.comments_count_override ?? user.commentsCountOverride ?? null,
    agreeCountOverride: user.agree_count_override ?? user.agreeCountOverride ?? null,
    disagreeCountOverride: user.disagree_count_override ?? user.disagreeCountOverride ?? null,
    sharesCountOverride: user.shares_count_override ?? user.sharesCountOverride ?? null,
    blueTickStatus: user.blue_tick_status ?? user.blueTickStatus ?? "none",
    accountStatus: user.account_status ?? user.accountStatus ?? "active",
    searchVisibility: Number(showInSearch) || 0,
    createdAt: user.created_at ?? user.createdAt ?? null,
  };
}

export function normalizePost(post = {}) {
  const author = post.author || post.user || {};
  const village = post.village && typeof post.village === "object" ? post.village.name || post.village.slug || "" : post.village || post.village_name || author.village || "";

  return {
    ...post,
    id: post.id ?? post.post_id ?? null,
    userId: post.user_id ?? post.userId ?? author.id ?? null,
    author: normalizeUser(author),
    content: post.content ?? "",
    category: post.category ?? post.category_name ?? "",
    categoryId: post.category_id ?? post.categoryId ?? null,
    post_type: post.post_type ?? post.postType ?? "text",
    postType: post.post_type ?? post.postType ?? "text",
    village,
    villageId: post.village_id ?? post.villageId ?? author.village_id ?? null,
    agrees: Number(post.agrees ?? post.agrees_count ?? post.agree_count ?? 0) || 0,
    disagrees: Number(post.disagrees ?? post.disagrees_count ?? post.disagree_count ?? 0) || 0,
    comments: Number(post.comments ?? post.comments_count ?? 0) || 0,
    shares: Number(post.shares ?? post.shares_count ?? 0) || 0,
    reports: Number(post.reports ?? post.reports_count ?? 0) || 0,
    status: post.status ?? (Number(post.is_hidden ?? post.isHidden ?? 0) ? "hidden" : "visible"),
    visibility: post.visibility ?? (Number(post.is_hidden ?? post.isHidden ?? 0) ? "hidden" : "visible"),
    createdAt: post.createdAt ?? post.created_at ?? null,
    updatedAt: post.updatedAt ?? post.updated_at ?? null,
  };
}

export function normalizeVillage(village = {}) {
  return {
    ...village,
    id: village.id ?? null,
    name: village.name ?? "",
    slug: village.slug ?? "",
    users: Number(village.totalUsers ?? village.total_users ?? village.users ?? 0) || 0,
    posts: Number(village.totalPosts ?? village.total_posts ?? village.posts ?? 0) || 0,
    createdAt: village.createdAt ?? village.created_at ?? null,
  };
}

export function normalizeReport(report = {}) {
  return {
    ...report,
    id: report.id ?? report.reportId ?? null,
    reportId: report.reportId ?? report.id ?? null,
    postId: report.postId ?? report.reported_post_id ?? report.reportedPostId ?? null,
    reportedUserId: report.reportedUserId ?? report.reported_user_id ?? null,
    reportedCommentId: report.reportedCommentId ?? report.reported_comment_id ?? null,
    reason: report.reason ?? "",
    customReason: report.customReason ?? report.custom_reason ?? report.moderation_notes ?? "",
    status: report.status ?? "pending",
    reportedBy: report.reportedBy ?? report.reporter_username ?? report.reported_by_display_name ?? "",
    reporterName: report.reporter_name ?? report.reportedBy ?? "",
    reportType: report.reportType ?? report.report_type ?? "post",
    postAuthorId: report.postAuthorId ?? report.post_author_id ?? report.post_user_id ?? null,
    postAuthorName: report.postAuthorName ?? report.post_author_name ?? "",
    postAuthorUsername: report.postAuthorUsername ?? report.post_author_username ?? "",
    reportedUserName: report.reportedUserName ?? report.reported_user_name ?? "",
    reportedUserUsername: report.reportedUserUsername ?? report.reported_user_username ?? "",
    targetUsername: report.targetUsername ?? report.target_username ?? report.postAuthorUsername ?? report.reportedUserUsername ?? "",
    createdAt: report.createdAt ?? report.created_at ?? null,
    updatedAt: report.updatedAt ?? report.updated_at ?? null,
  };
}

export function normalizeBlueTickRequest(request = {}) {
  return {
    ...request,
    id: request.id ?? null,
    requestStatus: request.request_status ?? request.requestStatus ?? "pending",
    requestReason: request.request_reason ?? request.requestReason ?? "",
    followersCount: Number(request.followers_count ?? request.followersCount ?? 0) || 0,
    createdAt: request.created_at ?? request.createdAt ?? request.requested_at ?? null,
    reviewedAt: request.reviewed_at ?? request.reviewedAt ?? null,
    reviewNotes: request.review_notes ?? request.reviewNotes ?? "",
    user: normalizeUser(request.user || {}),
  };
}

export function normalizeNews(news = {}) {
  const title = news.title ?? news.heading ?? "";
  const featuredImage = news.featured_image ?? news.featuredImage ?? "";
  const bannerImage = news.banner_image ?? news.bannerImage ?? "";
  const status = news.status ?? (news.isPublished ? "published" : "draft");
  const content = news.content ?? "";

  return {
    ...news,
    id: news.id ?? null,
    title,
    heading: title,
    subtitle: news.subtitle ?? news.subTitle ?? "",
    slug: news.slug ?? "",
    featuredImage,
    featured_image: featuredImage,
    bannerImage,
    banner_image: bannerImage,
    category: news.category ?? news.newsCategory ?? "",
    content,
    shortDescription: news.short_description ?? news.shortDescription ?? "",
    short_description: news.short_description ?? news.shortDescription ?? "",
    authorName: news.author_name ?? news.authorName ?? "",
    author_name: news.author_name ?? news.authorName ?? "",
    viewsCount: Number(news.views_count ?? news.viewsCount ?? 0) || 0,
    views_count: Number(news.views_count ?? news.viewsCount ?? 0) || 0,
    status,
    isPublished: status === "published",
    publishedAt: news.published_at ?? news.publishedAt ?? null,
    published_at: news.published_at ?? news.publishedAt ?? null,
    createdAt: news.created_at ?? news.createdAt ?? null,
    updatedAt: news.updated_at ?? news.updatedAt ?? null,
    seoTitle: news.seo_title ?? news.seoTitle ?? "",
    seo_title: news.seo_title ?? news.seoTitle ?? "",
    seoDescription: news.seo_description ?? news.seoDescription ?? "",
    seo_description: news.seo_description ?? news.seoDescription ?? "",
    metaKeywords: news.meta_keywords ?? news.metaKeywords ?? "",
    meta_keywords: news.meta_keywords ?? news.metaKeywords ?? "",
    excerpt: news.excerpt ?? summarizeHtml(content, 24),
  };
}

export function buildCsv(rows, columns) {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = typeof column.value === "function" ? column.value(row) : row[column.value];
          return escapeCsv(value ?? "");
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename, csv) {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }
}

export function downloadPdf(filename, rows, columns) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.text("ConnectNKT Users Export", 40, 40);

  const headers = columns.map((column) => column.label);
  const data = rows.map((row) =>
    columns.map((column) => {
      const value = typeof column.value === "function" ? column.value(row) : row[column.value];
      return value == null ? "" : String(value);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    margin: { left: 40, right: 40, bottom: 40 },
    tableWidth: "auto",
  });

  doc.save(filename);
}

function escapeCsv(value) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}
