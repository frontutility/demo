import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FiImage, FiList, FiPlus, FiTrash2, FiFileText } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonCard from "../../components/ui/SkeletonCard";
import MentionTextarea from "../../components/ui/MentionTextarea";
import PostCard from "../../components/cards/PostCard";
import { useApiResource } from "../../api/useApiResource";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { buildPostSlug } from "../../utils/profile";

export default function PostPage() {
  const { postId } = useParams();
  const { user: authUser, refreshUser } = useAuth();
  const isCreateMode = !postId || postId === "new";
  const isNumericPostId = /^\d+$/.test(String(postId || ""));
  const postResourcePath = isCreateMode
    ? "/api/posts"
    : isNumericPostId
      ? `/api/posts/${postId}`
      : `/api/posts/slug/${encodeURIComponent(String(postId))}`;
  const { data: posts = [], loading: postsLoading } = useApiResource(postResourcePath, {
    initialData: isCreateMode ? [] : null,
  });
  const { data: users = [], loading: usersLoading } = useApiResource("/api/users", { initialData: [] });
  const { data: categories = [] } = useApiResource("/api/post-categories", { initialData: [] });
  const [sessionReady, setSessionReady] = useState(!authUser?.loggedIn);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [postType, setPostType] = useState("text");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    document.title = "ConnectNKT | Post";
  }, []);

  useEffect(() => {
    let active = true;

    if (!authUser?.loggedIn) {
      setSessionReady(true);
      return undefined;
    }

    setSessionReady(false);
    Promise.resolve(refreshUser?.())
      .catch(() => null)
      .finally(() => {
        if (active) {
          setSessionReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [authUser?.loggedIn]);

  const post = useMemo(() => {
    if (isCreateMode) return null;
    if (isNumericPostId) {
      if (Array.isArray(posts)) {
        return posts.find((item) => String(item.id) === String(postId));
      }
      return posts && typeof posts === "object" ? posts : null;
    }
    if (posts && typeof posts === "object" && !Array.isArray(posts)) {
      return posts;
    }

    const postList = Array.isArray(posts) ? posts : [];
    return postList.find((item) => {
      const author = users.find((entry) => String(entry.id) === String(item.userId || item.user_id));
      const itemSlug = item.slug || buildPostSlug(item, author);
      return String(itemSlug) === String(postId);
    }) || null;
  }, [isCreateMode, isNumericPostId, postId, posts, users]);

  const user = users.find((item) => String(item.id) === String(post?.userId));
  const canCreateText = [1, "1", true, "true", "yes", "on"].includes(
    authUser?.can_create_text_post ?? authUser?.canCreateTextPost ?? true
  );
  const canCreatePoll = [1, "1", true, "true", "yes", "on"].includes(
    authUser?.can_create_poll_post ?? authUser?.canCreatePollPost ?? true
  );
  const canCreateImage = [1, "1", true, "true", "yes", "on"].includes(
    authUser?.can_create_image_post ?? authUser?.canCreateImagePost ?? false
  );
  const canCreateImageText = [1, "1", true, "true", "yes", "on"].includes(
    authUser?.can_create_image_text_post ?? authUser?.canCreateImageTextPost ?? false
  );
  const availablePostTypes = [
    ...(canCreateText ? [{ value: "text", label: "Text Post", icon: FiFileText }] : []),
    ...(canCreateImage ? [{ value: "image", label: "Image Post", icon: FiImage }] : []),
    ...(canCreateImageText ? [{ value: "image_text", label: "Image + Text", icon: FiPlus }] : []),
    ...(canCreatePoll ? [{ value: "poll", label: "Poll Post", icon: FiList }] : []),
  ];

  useEffect(() => {
    if (!isCreateMode) return;
    const allowedTypes = availablePostTypes.map((t) => t.value);
    if (!allowedTypes.includes(postType)) {
      setPostType(allowedTypes[0] || "text");
    }
  }, [isCreateMode, postType, availablePostTypes]);

  if (postsLoading || usersLoading || !sessionReady) {
    return <SkeletonCard />;
  }

  if (isCreateMode) {
    const selectedCategory =
      categories.find((item) => String(item.id) === String(category) || item.name === category || item.slug === category) ||
      categories.find((item) => item.name === "Other" || item.slug === "other");
    const categoryId = selectedCategory?.id ?? category ?? "";
    const trimmedContent = String(content || "").trim();
    const trimmedQuestion = String(pollQuestion || "").trim();
    const trimmedPollOptions = pollOptions.map((option) => String(option || "").trim()).filter(Boolean);
    const hasValidImage = Boolean(String(imageData || "").trim());
    const statusTone = /successfully/i.test(status) ? "text-success" : "text-error";
    const canPublish =
      !saving &&
      Boolean(categoryId) &&
      ((postType === "text" && trimmedContent) ||
        (postType === "image" && hasValidImage) ||
        (postType === "image_text" && trimmedContent && hasValidImage) ||
        (postType === "poll" && (trimmedQuestion || trimmedContent) && trimmedPollOptions.length >= 2));

    async function handleImageChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        setImageData(result);
        setImageName(file.name || "");
      };
      reader.readAsDataURL(file);
    }

    function updatePollOption(index, value) {
      setPollOptions((current) => current.map((item, currentIndex) => (currentIndex === index ? value : item)));
    }

    function addPollOption() {
      setPollOptions((current) => (current.length >= 6 ? current : [...current, ""]));
    }

    function removePollOption(index) {
      setPollOptions((current) => {
        if (current.length <= 2) {
          return current;
        }
        return current.filter((_, currentIndex) => currentIndex !== index);
      });
    }

    async function handleSubmitPost() {
      const cleanedContent = String(content || "").trim();
      const cleanedQuestion = String(pollQuestion || "").trim();
      const cleanedOptions = pollOptions.map((option) => String(option || "").trim()).filter(Boolean);

      if (!categoryId) {
        setStatus("Please choose a category.");
        return;
      }

      if (postType === "text" && !cleanedContent) {
        setStatus("Please write your post content.");
        return;
      }

      if (postType === "image" && !imageData) {
        setStatus("Please add an image.");
        return;
      }

      if (postType === "image_text" && (!imageData || !cleanedContent)) {
        setStatus("Please add both an image and text.");
        return;
      }

      if (postType === "poll" && !(cleanedQuestion || cleanedContent)) {
        setStatus("Please write a poll question.");
        return;
      }

      if (postType === "poll" && cleanedOptions.length < 2) {
        setStatus("Please add at least two poll options.");
        return;
      }

      setSaving(true);
      setStatus("");
      try {
        await api.post("/api/posts", {
          category_id: categoryId,
          content: postType === "poll" ? cleanedQuestion || cleanedContent : cleanedContent,
          post_type: postType,
          image: imageData || undefined,
          poll_question: cleanedQuestion || cleanedContent,
          poll_options: cleanedOptions,
        });
        setContent("");
        setCategory("");
        setPostType("text");
        setImageData("");
        setImageName("");
        setPollQuestion("");
        setPollOptions(["", ""]);
        setStatus("Post published successfully.");
      } catch (error) {
        setStatus(error?.response?.data?.message || error.message || "Could not publish post");
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="stack">
        <PageHeader
          title="Create post"
          subtitle="Write a post and publish it to your community."
        />
        <SectionCard title="Composer">
          <div className="stack">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 12px",
                borderRadius: 14,
                background: canCreateImage || canCreateImageText ? "rgba(46, 204, 113, 0.08)" : "rgba(243, 156, 18, 0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <strong>Post permissions</strong>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                {[
                  canCreateText && "Text",
                  canCreatePoll && "Poll",
                  canCreateImage && "Image",
                  canCreateImageText && "Image+Text",
                ].filter(Boolean).join(", ") || "None"}
              </span>
            </div>
            <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Select category</option>
              {categories.length ? (
                categories.map((item) => <option key={item.id || item.name || item} value={item.name || item}>{item.name || item}</option>)
              ) : (
                <option value="" disabled>
                  No categories available
                </option>
              )}
            </select>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {availablePostTypes.map((item) => {
                const Icon = item.icon;
                const active = postType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setPostType(item.value)}
                  >
                    <Icon />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {postType !== "image" ? (
              <label className="stack" style={{ gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{postType === "poll" ? "Poll Question" : "Text Editor"}</span>
                <MentionTextarea
                  value={postType === "poll" ? pollQuestion : content}
                  onChange={(nextValue) => {
                    if (postType === "poll") {
                      setPollQuestion(nextValue);
                    } else {
                      setContent(nextValue);
                    }
                  }}
                  placeholder={
                    postType === "poll"
                      ? "Ask a question for your poll..."
                      : postType === "image_text"
                        ? "Write the caption for your image post..."
                        : "Write your post here..."
                  }
                  rows={postType === "poll" ? 4 : 6}
                  className="stack"
                  textareaClassName="textarea"
                />
              </label>
            ) : (
              <label className="stack" style={{ gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Text Editor</span>
                <textarea
                  className="textarea"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Add an optional caption for your image post..."
                  rows={4}
                />
              </label>
            )}

            {(postType === "image" || postType === "image_text") && (canCreateImage || canCreateImageText) ? (
              <div className="stack" style={{ gap: 10 }}>
                <label className="btn btn-secondary" style={{ width: "fit-content" }}>
                  <FiImage />
                  {imageData ? "Replace image" : "Choose image"}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                </label>
                {imageName ? <div className="muted" style={{ fontSize: 13 }}>{imageName}</div> : null}
                {imageData ? (
                  <img
                    src={imageData}
                    alt="Selected preview"
                    style={{ width: "100%", maxWidth: 420, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                ) : null}
              </div>
            ) : null}

            {postType === "poll" && canCreatePoll ? (
              <div className="stack" style={{ gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <strong>Poll Options</strong>
                  <button type="button" className="btn btn-secondary" onClick={addPollOption} disabled={pollOptions.length >= 6}>
                    <FiPlus /> Add option
                  </button>
                </div>
                {pollOptions.map((option, index) => (
                  <div key={index} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={option}
                      onChange={(event) => updatePollOption(index, event.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => removePollOption(index)} disabled={pollOptions.length <= 2}>
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {status ? <div className={statusTone}>{status}</div> : null}
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: "fit-content" }}
              disabled={!canPublish}
              onClick={handleSubmitPost}
            >
              {saving ? "Publishing..." : "Publish Draft"}
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!post) {
    return (
      <EmptyState
        title="Post not found"
        message="The requested post could not be found in the database."
      />
    );
  }

  // ========== IMPORTANT: Pass user and post to PostCard ==========
  return <PostCard post={post} user={user} />;
}