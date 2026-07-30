import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import quickComments from "./quickComments";
import {
  FiMessageCircle,
  FiMoreVertical,
  FiShare2,
  FiThumbsDown,
  FiThumbsUp,
  FiUser,
  FiAlertTriangle,
  FiCheck,
  FiCopy,
  FiEdit3,
  FiMessageSquare,
  FiTrash2,
  FiX,
  FiBookmark,
  FiStar,
} from "react-icons/fi";
import { formatCount, formatDate } from "../../utils/formatters";
import { getProfilePath, getPostPath, resolveMediaUrl } from "../../utils/profile";
import { useOptionalAuth } from "../../context/AuthContext";
import api from "../../services/api";
import UserAvatar from "../ui/UserAvatar";
import UserNameWithBadge from "../ui/UserNameWithBadge";
import MentionTextarea from "../ui/MentionTextarea";
import SuccessModal from "../modals/SuccessModal";
import InfoModal from "../modals/InfoModal";
import ErrorModal from "../modals/ErrorModal";
import ConfirmationModal from "../modals/ConfirmationModal";

const reportReasons = [
  "Spam",
  "Fake Information",
  "Harassment",
  "Hate Speech",
  "Violence",
  "Adult Content",
  "Child Safety",
  "Terrorism",
  "Scam",
  "Impersonation",
  "Copyright",
  "Other",
];

function normalizeComment(comment) {
  const replies = Array.isArray(comment.replies) ? comment.replies.map(normalizeComment) : [];
  return {
    ...comment,
    id: comment.id,
    userId: comment.userId ?? comment.user_id,
    body: comment.body ?? comment.content ?? "",
    content: comment.content ?? comment.body ?? "",
    createdAt: comment.createdAt ?? comment.created_at ?? null,
    updatedAt: comment.updatedAt ?? comment.updated_at ?? null,
    userName: comment.user_name ?? comment.userName ?? "",
    userUsername: comment.user_username ?? comment.userUsername ?? "",
    userProfileImageUrl: comment.user_profile_image_url ?? comment.userProfileImageUrl ?? "",
    blue_tick_status: comment.blue_tick_status ?? comment.user_blue_tick_status ?? comment.blueTickStatus ?? "",
    villageName: comment.villageName ?? comment.village_name ?? "",
    parentCommentId: comment.parentCommentId ?? comment.parent_comment_id ?? null,
    agreeCount: Number(comment.agreeCount ?? comment.agree_count ?? 0),
    disagreeCount: Number(comment.disagreeCount ?? comment.disagree_count ?? 0),
    replyCount: Number(comment.replyCount ?? comment.reply_count ?? replies.length ?? 0),
    myReaction: comment.myReaction ?? comment.my_reaction ?? "",
    isEdited: Boolean(comment.isEdited ?? comment.is_edited),
    isDeleted: Boolean(comment.isDeleted ?? comment.is_deleted),
    replies,
  };
}

function renderPostContent(content = "") {
  const parts = [];
  const regex = /(@[a-zA-Z0-9_-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(String(content || ""))) !== null) {
    const start = match.index;
    const username = match[1] || "";
    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }
    parts.push(
      <Link key={`${username}-${start}`} to={`/profile/${encodeURIComponent(username.slice(1))}`} className="mention-link">
        {username}
      </Link>
    );
    lastIndex = start + username.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

function countWords(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function truncateWords(value = "", maxWords = 50) {
  const words = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function ModalPortal({ children }) {
  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(children, document.body);
}

function computePollPercentages(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return { options: [], totalVotes: 0 };
  }

  const updatedOptions = options.map((opt) => {
    let votes = Number(opt.votesCount ?? opt.votes_count ?? opt.votes ?? 0);
    if (!Number.isFinite(votes) || votes < 0) {
      votes = 0;
    }
    votes = Math.floor(votes);
    return {
      ...opt,
      votesCount: votes,
      votes_count: votes,
    };
  });

  const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votesCount, 0);

  if (totalVotes === 0) {
    updatedOptions.forEach((opt) => {
      opt.percentage = 0;
      opt.percent = 0;
    });
    return { options: updatedOptions, totalVotes: 0 };
  }

  const rounded = updatedOptions.map((opt) => {
    const rawPercent = (opt.votesCount / totalVotes) * 100;
    const roundedPercent = Math.round(rawPercent * 10) / 10;
    return Math.max(0, Math.min(100, roundedPercent));
  });

  let highestIndex = 0;
  let highestPercent = rounded[0] ?? 0;
  rounded.forEach((percent, index) => {
    if (percent > highestPercent) {
      highestPercent = percent;
      highestIndex = index;
    }
  });

  const sumPercentages = rounded.reduce((sum, percent) => sum + percent, 0);
  const adjustment = Math.round((100 - sumPercentages) * 10) / 10;

  if (adjustment !== 0) {
    const adjusted = Math.round((rounded[highestIndex] + adjustment) * 10) / 10;
    rounded[highestIndex] = Math.max(0, Math.min(100, adjusted));
  }

  updatedOptions.forEach((opt, index) => {
    const percent = Math.max(0, Math.min(100, rounded[index] ?? 0));
    opt.percentage = percent;
    opt.percent = percent;
  });

  return {
    options: updatedOptions,
    totalVotes,
  };
}

function normalizePollData(poll, fallbackPostId = null) {
  if (!poll || typeof poll !== "object") {
    return null;
  }

  const normalizedId = poll.id ?? poll.poll_id ?? poll.pollId ?? fallbackPostId ?? null;
  const normalizedPostId = poll.postId ?? poll.post_id ?? fallbackPostId ?? null;
  const rawOptions = Array.isArray(poll.options)
    ? poll.options.map((opt = {}) => {
        const votes = Number(opt.votesCount ?? opt.votes_count ?? opt.votes ?? 0) || 0;
        return {
          id: opt.id ?? opt.option_id ?? opt.optionId ?? null,
          optionText: opt.optionText ?? opt.option_text ?? opt.text ?? "Option",
          option_text: opt.option_text ?? opt.optionText ?? opt.text ?? "Option",
          votesCount: votes,
          votes_count: votes,
        };
      })
    : [];

  const { options, totalVotes } = computePollPercentages(rawOptions);

  const hasVoted = [poll.hasVoted, poll.has_voted, poll.voted].some((value) => value === true);
  const userVoteOptionId = poll.userVoteOptionId ?? poll.user_vote_option_id ?? null;

  return {
    id: normalizedId,
    postId: normalizedPostId,
    question: poll.question ?? poll.poll_question ?? "Poll",
    options,
    totalVotes,
    total_votes: totalVotes,
    hasVoted,
    has_voted: hasVoted,
    userVoteOptionId,
    user_vote_option_id: userVoteOptionId,
  };
}

export default function PostCard({ post, user, compact = false, clickable = false, showPinnedBadge = false }) {
  const navigate = useNavigate();
  const authContext = useOptionalAuth();
  const authUser = authContext?.user ?? { loggedIn: false };
  const isAdmin = Boolean(authUser?.type === "admin" || String(authUser?.role || "").includes("admin"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuContentRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportCustomReason, setReportCustomReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [activeReaction, setActiveReaction] = useState(String(post?.my_reaction || post?.reaction_type || ""));
  const [counts, setCounts] = useState({
    agrees: Number(post?.agrees ?? post?.agrees_count ?? 0),
    disagrees: Number(post?.disagrees ?? post?.disagrees_count ?? 0),
    comments: Number(post?.comments ?? post?.comments_count ?? 0),
    shares: Number(post?.shares ?? post?.shares_count ?? 0),
  });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpenFor, setReplyOpenFor] = useState(null);
  const [repliesOpen, setRepliesOpen] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({});
  const [replySaving, setReplySaving] = useState({});
  const [editCommentId, setEditCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null);
  const [deletingCommentIds, setDeletingCommentIds] = useState(new Set());
  const [shareToast, setShareToast] = useState("");
  const [messageModal, setMessageModal] = useState({ open: false, type: "info", title: "", message: "" });
  const [followState, setFollowState] = useState(() => (typeof user?.is_following === "undefined" ? null : Boolean(user.is_following)));
  const [followBack, setFollowBack] = useState(() => (typeof user?.is_followed_by === "undefined" ? false : Boolean(user.is_followed_by)));
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [isHidden, setIsHidden] = useState(Boolean(post?.isHidden));
  const [isPinned, setIsPinned] = useState(Boolean(post?.isPinned ?? post?.is_pinned));
  const [isGloballyPinned, setIsGloballyPinned] = useState(Boolean(post?.isGloballyPinned ?? post?.is_globally_pinned));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const commentInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [showAgreeAnim, setShowAgreeAnim] = useState(false);
  const dblClickLockRef = useRef(false);

  // Close comments when clicking outside
  useEffect(() => {
    if (!commentsOpen) return;

    function handleClickOutside(event) {
      const commentsElement = commentsContainerRef.current;
      if (commentsElement && !commentsElement.contains(event.target)) {
        setCommentsOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [commentsOpen]);

  useEffect(() => {
    setActiveReaction(String(post?.my_reaction || post?.reaction_type || ""));
    setCounts({
      agrees: Number(post?.agrees ?? post?.agrees_count ?? 0),
      disagrees: Number(post?.disagrees ?? post?.disagrees_count ?? 0),
      comments: Number(post?.comments ?? post?.comments_count ?? 0),
      shares: Number(post?.shares ?? post?.shares_count ?? 0),
    });
    setIsHidden(Boolean(post?.isHidden));
    setIsPinned(Boolean(post?.isPinned ?? post?.is_pinned));
    setIsGloballyPinned(Boolean(post?.isGloballyPinned ?? post?.is_globally_pinned));
  }, [post]);

  useEffect(() => {
    if (typeof user?.is_following !== "undefined") {
      setFollowState(Boolean(user.is_following));
    }
    if (typeof user?.is_followed_by !== "undefined") {
      setFollowBack(Boolean(user.is_followed_by));
    }
  }, [user?.is_following, user?.is_followed_by, user?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideMenuTrigger = menuRef.current && menuRef.current.contains(event.target);
      const clickedInsideMenuContent = menuContentRef.current && menuContentRef.current.contains(event.target);

      if (!clickedInsideMenuTrigger && !clickedInsideMenuContent) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setShareOpen(false);
        setReportOpen(false);
        setCommentsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function updateMenuPosition() {
    const button = menuButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = 240;
    const left = Math.min(Math.max(rect.right - width + 8, 8), window.innerWidth - width - 12);
    setMenuPosition({ top: rect.bottom + 8, left });
  }

  useEffect(() => {
    if (!menuOpen) return undefined;

    updateMenuPosition();

    function handleResizeScroll() {
      updateMenuPosition();
    }

    window.addEventListener("resize", handleResizeScroll);
    window.addEventListener("scroll", handleResizeScroll, true);

    return () => {
      window.removeEventListener("resize", handleResizeScroll);
      window.removeEventListener("scroll", handleResizeScroll, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!commentsOpen || !post?.id) return;

    let mounted = true;
    setCommentsLoading(true);
    setCommentError("");

    loadComments()
      .catch((error) => {
        if (!mounted) return;
        setCommentError(error?.response?.data?.message || error.message || "Could not load comments");
      })
      .finally(() => {
        if (mounted) {
          setCommentsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [commentsOpen, post?.id]);

  useEffect(() => {
    if (!showSuggestions) {
      setSelectedSuggestionIndex(-1);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[selectedSuggestionIndex];
        if (selected) {
          setCommentText(selected);
          setShowSuggestions(false);
          setSuggestions([]);
          setSelectedSuggestionIndex(-1);
          commentInputRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSuggestions, suggestions, selectedSuggestionIndex]);

  // Keep the portal dropdown aligned with the comment textarea
  useEffect(() => {
    function computePos() {
      const el = commentInputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDropdownPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }

    if (!showSuggestions) return;

    computePos();
    window.addEventListener("resize", computePos);
    window.addEventListener("scroll", computePos, true);
    return () => {
      window.removeEventListener("resize", computePos);
      window.removeEventListener("scroll", computePos, true);
    };
  }, [showSuggestions]);

  const profilePath = getProfilePath(user);
  const postPath = getPostPath(post, user);
  const postUrl = `${window.location.origin.replace(/\/+$/, "")}${postPath}`;
  const isOwnPost =
    Boolean(authUser?.loggedIn) &&
    Boolean(user?.id) &&
    (
      String(authUser.id) === String(user.id) ||
      String(authUser.username || "").toLowerCase() === String(user.username || "").toLowerCase() ||
      String(authUser.email || "").toLowerCase() === String(user.email || "").toLowerCase()
    );
  const canFollowAuthor = Boolean(user?.id && !isOwnPost);

  function showToast(message) {
    setShareToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setShareToast(""), 2000);
  }

  async function registerShare() {
    try {
      const response = await api.post(`/api/posts/${post.id}/share`);
      const payload = response.data?.data ?? response.data ?? {};
      setCounts((current) => ({
        ...current,
        shares: Number(payload.shares ?? payload.shares_count ?? current.shares + 1),
      }));
    } catch (error) {
      setCounts((current) => ({ ...current, shares: current.shares + 1 }));
    }
  }

  async function copyPostLink() {
    try {
      await navigator.clipboard.writeText(postUrl);
      setMessageModal({ open: true, type: "success", title: "Copied", message: "Post link copied to clipboard." });
    } catch (error) {
      setMessageModal({ open: true, type: "info", title: "Copy post link", message: `Use the link below to share manually:\n${postUrl}` });
    }
    await registerShare();
    showToast("Link copied successfully");
    setShareOpen(false);
    setMenuOpen(false);
  }

  async function shareOnWhatsApp() {
    const text = encodeURIComponent(`${user?.name || "ConnectNKT post"}\n${postUrl}`);
    await registerShare();
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    showToast("Shared on WhatsApp");
    setShareOpen(false);
    setMenuOpen(false);
  }

  async function handleReaction(reactionType) {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    try {
      const isSameReaction = activeReaction === reactionType;
      const response = isSameReaction
        ? await api.delete(`/api/posts/${post.id}/react`)
        : await api.post(`/api/posts/${post.id}/react`, { reaction_type: reactionType });

      const payload = response.data?.data ?? response.data ?? {};
      setActiveReaction(isSameReaction ? "" : reactionType);
      setCounts({
        agrees: Number(payload.agrees ?? payload.agrees_count ?? counts.agrees),
        disagrees: Number(payload.disagrees ?? payload.disagrees_count ?? counts.disagrees),
        comments: Number(payload.comments ?? payload.comments_count ?? counts.comments),
        shares: Number(payload.shares ?? payload.shares_count ?? counts.shares),
      });
    } catch (error) {
      setMessageModal({ open: true, type: "danger", title: "Could not update reaction", message: error?.response?.data?.message || error.message || "Could not update reaction" });
    }
  }

  async function loadComments() {
    if (!post?.id) return;
    setCommentsLoading(true);
    setCommentError("");
    try {
      const response = await api.get(`/api/posts/${post.id}/comments`);
      const payload = response.data?.data ?? response.data ?? {};
      const nextComments = Array.isArray(payload.comments) ? payload.comments.map(normalizeComment) : [];
      setComments(nextComments);
      setCounts((current) => ({ ...current, comments: Number(payload.comments_count ?? current.comments) }));
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not load comments");
    } finally {
      setCommentsLoading(false);
    }
  }

  function updateCommentInTree(commentId, updater) {
    setComments((current) =>
      current.map((comment) => {
        if (String(comment.id) === String(commentId)) {
          return updater(comment);
        }
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        return {
          ...comment,
          replies: replies.map((reply) => (String(reply.id) === String(commentId) ? updater(reply) : reply)),
        };
      })
    );
  }

  function replaceCommentInTree(nextComment) {
    const normalized = normalizeComment(nextComment);
    updateCommentInTree(normalized.id, () => normalized);
  }

  function findCommentInTree(commentId) {
    for (const comment of comments) {
      if (String(comment.id) === String(commentId)) return comment;
      const reply = (comment.replies || []).find((item) => String(item.id) === String(commentId));
      if (reply) return reply;
    }
    return null;
  }

  async function loadReplies(parentId) {
    setRepliesLoading((current) => ({ ...current, [parentId]: true }));
    setCommentError("");
    try {
      const response = await api.get(`/api/comments/${parentId}/replies`);
      const payload = response.data?.data ?? response.data ?? {};
      const replies = Array.isArray(payload.replies) ? payload.replies.map(normalizeComment) : [];
      updateCommentInTree(parentId, (comment) => ({ ...comment, replies, replyCount: Math.max(comment.replyCount || 0, replies.length) }));
      setRepliesOpen((current) => ({ ...current, [parentId]: true }));
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not load replies");
    } finally {
      setRepliesLoading((current) => ({ ...current, [parentId]: false }));
    }
  }

  function openReplyBox(comment) {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    const rootId = comment.parentCommentId || comment.id;
    const mention = comment.userUsername ? `@${comment.userUsername} ` : "";
    setReplyOpenFor(comment.id);
    setRepliesOpen((current) => ({ ...current, [rootId]: true }));
    setReplyDrafts((current) => ({ ...current, [comment.id]: current[comment.id] ?? mention }));
    window.setTimeout(() => document.querySelector(`[data-reply-input="${comment.id}"]`)?.focus(), 0);
  }

  async function submitReply(event, comment) {
    event.preventDefault();
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    const draft = String(replyDrafts[comment.id] || "").trim();
    if (!draft) {
      setCommentError("Please write a reply before sending.");
      return;
    }
    if (draft.length > 5000) {
      setCommentError("Reply is too long (max 5000 characters).");
      return;
    }
    const body = countWords(draft) > 50 ? truncateWords(draft, 50) : draft;
    const rootId = comment.parentCommentId || comment.id;

    setReplySaving((current) => ({ ...current, [comment.id]: true }));
    setCommentError("");
    try {
      const response = await api.post(`/api/posts/${post.id}/comments`, {
        body,
        parent_comment_id: comment.id,
      });
      const payload = response.data?.data ?? response.data ?? {};
      const reply = normalizeComment(payload.comment ?? {});
      updateCommentInTree(rootId, (root) => ({
        ...root,
        replyCount: Number(root.replyCount || 0) + 1,
        replies: [...(root.replies || []), reply],
      }));
      setReplyDrafts((current) => ({ ...current, [comment.id]: "" }));
      setReplyOpenFor(null);
      setRepliesOpen((current) => ({ ...current, [rootId]: true }));
      setCounts((current) => ({ ...current, comments: Number(payload.comments_count ?? current.comments + 1) }));
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not post reply");
    } finally {
      setReplySaving((current) => ({ ...current, [comment.id]: false }));
    }
  }

  const updateSuggestions = (input) => {
    if (!input || input.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerInput = input.toLowerCase().trim();
    const filtered = quickComments.filter(comment => 
      comment.toLowerCase().includes(lowerInput)
    );
    
    if (filtered.length > 0) {
      setSuggestions(filtered);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  function updateMainCommentText(nextText) {
    const nextValue = String(nextText || "");
    const nextCount = countWords(nextValue);
    if (nextValue.length > 5000) {
      setCommentError("Comments are limited to 5000 characters.");
      return;
    }
    setCommentText(nextValue);
    if (nextCount > 50) {
      setCommentError("Comments are limited to 50 words.");
    } else if (commentError === "Comments are limited to 50 words." || commentError === "Comments are limited to 5000 characters.") {
      setCommentError("");
    }
    updateSuggestions(nextValue);
  }

  async function postQuickComment(body) {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    if (!post?.id) return;

    const cleanBody = String(body || "").trim();
    if (!cleanBody) return;
    if (cleanBody.length > 5000) {
      setCommentError("Quick comment is too long (max 5000 characters).");
      return;
    }

    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await api.post(`/api/posts/${post.id}/comments`, { body: cleanBody });
      const payload = response.data?.data ?? response.data ?? {};
      const created = payload.comment ? normalizeComment(payload.comment) : null;
      setCommentText("");
      setShowSuggestions(false);
      setSuggestions([]);
      if (created) {
        setComments((current) => [...current, created]);
        setCounts((current) => ({ ...current, comments: Number(payload.comments_count ?? current.comments + 1) }));
      } else {
        await loadComments();
      }
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not post comment");
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleSubmitComment(event) {
    event.preventDefault();
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    if (!post?.id) return;

    const body = String(commentText || "").trim();
    if (!body) {
      setCommentError("Please write a comment before sending.");
      return;
    }
    if (body.length > 5000) {
      setCommentError("Comment is too long (max 5000 characters).");
      return;
    }
    let finalBody = body;
    if (countWords(body) > 50) {
      finalBody = truncateWords(body, 50);
      setCommentError("Comment truncated to 50 words and posted.");
    }

    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await api.post(`/api/posts/${post.id}/comments`, { body: finalBody });
      const payload = response.data?.data ?? response.data ?? {};
      const created = payload.comment ? normalizeComment(payload.comment) : null;
      setCommentText("");
      setShowSuggestions(false);
      setSuggestions([]);
      if (created) {
        setComments((current) => [...current, created]);
        setCounts((current) => ({ ...current, comments: Number(payload.comments_count ?? current.comments + 1) }));
      } else {
        await loadComments();
      }
      window.setTimeout(() => {
        if (String(commentError).includes("truncated")) setCommentError("");
      }, 2500);
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not post comment");
    } finally {
      setCommentSaving(false);
    }
  }

  function openDeleteCommentConfirm(comment) {
    setDeleteCommentTarget(comment);
  }

  async function handleDeleteComment(commentId) {
    setDeleteCommentTarget(null);
    setDeletingCommentIds((prev) => new Set(prev).add(commentId));

    const targetComment = findCommentInTree(commentId);
    const isReply = targetComment && targetComment.parentCommentId;
    const rootId = targetComment ? (targetComment.parentCommentId || commentId) : null;
    const previousComments = comments;

    updateCommentInTree(commentId, (comment) => ({ ...comment, isDeleted: true, body: "This comment has been deleted.", content: "This comment has been deleted." }));
    setCounts((current) => ({ ...current, comments: Math.max(0, current.comments - 1) }));

    try {
      const response = await api.delete(`/api/comments/${commentId}`);
      const payload = response.data?.data ?? response.data ?? {};
      setCounts((current) => ({ ...current, comments: Number(payload.comments_count ?? current.comments) }));
      if (isReply && rootId) {
        updateCommentInTree(rootId, (comment) => ({
          ...comment,
          replyCount: Math.max(0, (comment.replyCount || 1) - 1),
        }));
      }
    } catch (error) {
      setComments(previousComments);
      setCounts((current) => ({ ...current, comments: previousComments.reduce((total, c) => {
        let count = 1;
        if (c.replies) count += c.replies.length;
        return total + count;
      }, 0) }));
      setCommentError(error?.response?.data?.message || error.message || "Could not delete comment");
    } finally {
      setDeletingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }

  function openCommentEdit(comment) {
    setEditCommentId(comment.id);
    setEditCommentText(String(comment.body || comment.content || ""));
    window.setTimeout(() => document.querySelector(`[data-edit-comment="${comment.id}"]`)?.focus(), 0);
  }

  async function saveCommentEdit(event, commentId) {
    event.preventDefault();
    const trimmedBody = String(editCommentText || "").trim();
    if (!trimmedBody) {
      setCommentError("Comment body cannot be empty.");
      return;
    }
    if (trimmedBody.length > 5000) {
      setCommentError("Comment is too long (max 5000 characters).");
      return;
    }
    const body = countWords(trimmedBody) > 50 ? truncateWords(trimmedBody, 50) : trimmedBody;
    setCommentError("");
    try {
      const response = await api.put(`/api/comments/${commentId}`, { body });
      const payload = response.data?.data ?? response.data ?? {};
      replaceCommentInTree(payload);
      setEditCommentId(null);
      setEditCommentText("");
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not edit comment");
    }
  }

  async function handleCommentReaction(comment, reactionType) {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    try {
      const response = comment.myReaction === reactionType
        ? await api.delete(`/api/comments/${comment.id}/react`)
        : await api.post(`/api/comments/${comment.id}/react`, { reaction_type: reactionType });
      const payload = response.data?.data ?? response.data ?? {};
      replaceCommentInTree(payload);
    } catch (error) {
      setCommentError(error?.response?.data?.message || error.message || "Could not update reaction");
    }
  }

  function renderCommentItem(comment, depth = 0) {
    const canEdit = !comment.isDeleted && String(comment.userId) === String(authUser?.id || "");
    const canDelete = !comment.isDeleted && (String(comment.userId) === String(authUser?.id || "") || isAdmin);
    const rootId = comment.parentCommentId || comment.id;
    const repliesVisible = Boolean(repliesOpen[rootId]);
    const isReply = depth > 0;

    return (
      <div key={comment.id} className={`comment-thread ${isReply ? "is-reply" : ""}`}>
        <div className={`comment-item ${comment.isDeleted ? "is-deleted" : ""}`}>
          <Link to={getProfilePath({ username: comment.userUsername, id: comment.userId })} className="comment-avatar">
            <UserAvatar
              user={{
                name: comment.userName || comment.userUsername || "User",
                username: comment.userUsername,
                avatar_url: comment.userProfileImageUrl,
              }}
              name={comment.userName || comment.userUsername || "User"}
              size={isReply ? 28 : 32}
            />
          </Link>
          <div className="comment-body">
            <div className="comment-meta">
              <UserNameWithBadge
                user={{
                  id: comment.userId,
                  name: comment.userName,
                  username: comment.userUsername,
                  blue_tick_status: comment.blue_tick_status || comment.blueTickStatus,
                }}
                name={comment.userName || comment.userUsername || "User"}
                className="comment-author"
                badgeSize={14}
              />
              <span className="comment-date">
                {comment.villageName ? `${comment.villageName} • ` : ""}
                {formatDate(comment.createdAt)}
                {comment.isEdited && !comment.isDeleted ? " • Edited" : ""}
              </span>
              <div className="comment-meta-actions">
                {canEdit && (
                  <button type="button" className="comment-icon-btn" onClick={() => openCommentEdit(comment)} aria-label="Edit comment">
                    <FiEdit3 size={13} />
                  </button>
                )}
                {canDelete && (
                  <button type="button" className="comment-icon-btn danger" onClick={() => openDeleteCommentConfirm(comment)} disabled={deletingCommentIds.has(comment.id)} aria-label="Delete comment">
                    <FiTrash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {editCommentId === comment.id ? (
              <form className="comment-edit-form" onSubmit={(event) => saveCommentEdit(event, comment.id)}>
                <textarea
                  data-edit-comment={comment.id}
                  className="comment-textarea compact"
                  rows={2}
                  value={editCommentText}
                  onChange={(event) => setEditCommentText(event.target.value)}
                  onKeyUp={(event) => event.stopPropagation()}
                />
                <div className="comment-inline-actions">
                  <button type="button" className="comment-link-btn" onClick={() => setEditCommentId(null)}>Cancel</button>
                  <button type="submit" className="comment-link-btn primary" disabled={!editCommentText.trim()}>Save</button>
                </div>
              </form>
            ) : (
              <div className={`comment-text ${comment.isDeleted ? "deleted-text" : ""}`}>{renderPostContent(comment.body)}</div>
            )}

            <div className="comment-actions-row">
              <button type="button" className={`comment-link-btn ${comment.myReaction === "agree" ? "active" : ""}`} onClick={() => handleCommentReaction(comment, "agree")} disabled={comment.isDeleted}>
                <FiThumbsUp size={13} /> Agree {formatCount(comment.agreeCount)}
              </button>
              <button type="button" className={`comment-link-btn ${comment.myReaction === "disagree" ? "active danger" : ""}`} onClick={() => handleCommentReaction(comment, "disagree")} disabled={comment.isDeleted}>
                <FiThumbsDown size={13} /> Disagree {formatCount(comment.disagreeCount)}
              </button>
              <button type="button" className="comment-link-btn" onClick={() => openReplyBox(comment)} disabled={comment.isDeleted}>
                Reply
              </button>
            </div>

            {replyOpenFor === comment.id && (
              <form className="reply-form" onSubmit={(event) => submitReply(event, comment)}>
                <div className="replying-to">Replying to @{comment.userUsername || "user"}</div>
                <textarea
                  data-reply-input={comment.id}
                  className="comment-textarea compact"
                  rows={2}
                  value={replyDrafts[comment.id] || ""}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                  onKeyUp={(event) => event.stopPropagation()}
                  placeholder="Write a reply..."
                  disabled={Boolean(replySaving[comment.id])}
                />
                <div className="comment-inline-actions">
                  <button type="button" className="comment-link-btn" onClick={() => setReplyOpenFor(null)}>Cancel</button>
                  <button type="submit" className="comment-link-btn primary" disabled={Boolean(replySaving[comment.id]) || !String(replyDrafts[comment.id] || "").trim()}>
                    {replySaving[comment.id] ? "..." : "Reply"}
                  </button>
                </div>
              </form>
            )}

            {!isReply && Number(comment.replyCount || 0) > 0 && (
              <button
                type="button"
                className="view-replies-btn"
                onClick={() => {
                  if (repliesVisible) {
                    setRepliesOpen((current) => ({ ...current, [comment.id]: false }));
                  } else if ((comment.replies || []).length > 0) {
                    setRepliesOpen((current) => ({ ...current, [comment.id]: true }));
                  } else {
                    loadReplies(comment.id);
                  }
                }}
              >
                {repliesLoading[comment.id] ? "Loading replies..." : repliesVisible ? "Hide replies" : `View replies (${formatCount(comment.replyCount)})`}
              </button>
            )}
          </div>
        </div>

        {!isReply && repliesVisible && (comment.replies || []).length > 0 && (
          <div className="replies-list">
            {comment.replies.map((reply) => renderCommentItem(reply, 1))}
          </div>
        )}
      </div>
    );
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    const otherText = reportReason === "Other" ? reportCustomReason.trim() : "";
    const wordCount = countWords(otherText);
    if (reportReason === "Other" && !otherText) {
      setReportError("Please describe the reason.");
      return;
    }
    if (reportReason === "Other" && wordCount > 50) {
      setReportError("Custom reason must be 50 words or fewer.");
      return;
    }

    setReportSaving(true);
    setReportError("");
    try {
      await api.post("/api/reports", {
        report_type: "post",
        reported_post_id: post.id,
        reason: reportReason,
        custom_reason: otherText,
      });
      setReportOpen(false);
      setMenuOpen(false);
      setReportReason("Spam");
      setReportCustomReason("");
      setMessageModal({ open: true, type: "success", title: "Report submitted", message: "Your report has been submitted successfully." });
    } catch (error) {
      setReportError(error?.response?.data?.message || error.message || "Could not submit report");
    } finally {
      setReportSaving(false);
    }
  }

  async function handleFollowToggle() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    if (!canFollowAuthor) return;

    const nextFollowState = !followState;
    setFollowLoading(true);
    setFollowState(nextFollowState);

    try {
      const response = nextFollowState
        ? await api.post(`/api/users/${user.id}/follow`)
        : await api.delete(`/api/users/${user.id}/follow`);
      const payload = response.data?.data ?? response.data ?? {};
      const persistedState =
        typeof payload.is_following !== "undefined"
          ? Boolean(payload.is_following)
          : nextFollowState;
      setFollowState(persistedState);
      if (typeof payload.is_followed_by !== "undefined") {
        setFollowBack(Boolean(payload.is_followed_by));
      }
    } catch (error) {
      setFollowState(!nextFollowState);
      setMessageModal({
        open: true,
        type: "danger",
        title: "Unable to update follow status",
        message: error?.response?.data?.message || error.message || "Could not update follow status",
      });
    } finally {
      setFollowLoading(false);
    }
  }

  async function loadCategories() {
    if (categories.length) {
      return;
    }

    setCategoriesLoading(true);
    try {
      const response = await api.get("/api/post-categories");
      const payload = response.data?.data ?? response.data ?? [];
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      // console.error("Failed to load categories", error);
    } finally {
      setCategoriesLoading(false);
    }
  }

  function openEditModal() {
    setEditContent(String(post?.content || ""));
    setEditCategory(String(post?.categoryId ?? post?.category_id ?? post?.category ?? ""));
    setEditError("");
    setEditOpen(true);
    loadCategories();
    setMenuOpen(false);
  }

  async function handleSaveEdit() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    const trimmedContent = String(editContent || "").trim();
    if (!trimmedContent) {
      setEditError("Please enter post content.");
      return;
    }
    if (countWords(trimmedContent) > 250) {
      setEditError("Posts must be 250 words or fewer.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      await api.put(`/api/posts/${post.id}`, {
        content: trimmedContent,
        category_id: editCategory,
      });
      setEditOpen(false);
      window.location.reload();
    } catch (error) {
      setEditError(error?.response?.data?.message || error.message || "Could not save post changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleHidden() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionMessage("");

    try {
      if (isHidden) {
        await api.post(`/api/posts/${post.id}/restore`);
        setIsHidden(false);
      } else {
        await api.post(`/api/posts/${post.id}/hide`);
        setIsHidden(true);
      }
      setMenuOpen(false);
    } catch (error) {
      setActionError(error?.response?.data?.message || error.message || "Could not update post visibility");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeletePost() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionMessage("");

    try {
      await api.delete(`/api/posts/${post.id}`);
      window.location.href = "/";
    } catch (error) {
      setActionError(error?.response?.data?.message || error.message || "Could not delete post");
    } finally {
      setActionLoading(false);
    }
  }

  function confirmDeletePost() {
    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }
    setDeleteConfirmOpen(true);
  }

  function handleCardClick(event) {
    if (!clickable) return;
    const target = event.target;
    if (target?.closest?.("a,button,input,textarea,select,label")) {
      return;
    }
    navigate(postPath);
  }

  function handleDoubleClickAgree(event) {
    // Skip if the click landed on an interactive element
    const target = event.target;
    if (target?.closest?.("a,button,input,textarea,select,label")) return;

    // Prevent duplicate calls within the same gesture
    if (dblClickLockRef.current) return;
    dblClickLockRef.current = true;

    // Always show the animation
    setShowAgreeAnim(true);
    setTimeout(() => {
      setShowAgreeAnim(false);
      dblClickLockRef.current = false;
    }, 700);

    // Only send API request if not already agreed
    if (activeReaction !== "agree") {
      handleReaction("agree");
    }
  }

  const reactionTone = useMemo(() => {
    return {
      agree: activeReaction === "agree",
      disagree: activeReaction === "disagree",
    };
  }, [activeReaction]);

  const postType = String(post?.postType ?? post?.post_type ?? "text").toLowerCase();
  const imageItems = Array.isArray(post?.images)
    ? post.images
    : post?.imageUrl || post?.image_url
      ? [
          {
            imageUrl: post?.imageUrl ?? post?.image_url,
            altText: post?.content || "Post image",
          },
        ]
      : [];

  const pollData = useMemo(() => {
    if (!post) {
      return null;
    }

    const postType = String(post?.postType ?? post?.post_type ?? "text").toLowerCase();
    if (postType !== "poll") {
      return null;
    }

    return normalizePollData(post?.poll, post?.id);
  }, [post]);

  const [pollState, setPollState] = useState(() => normalizePollData(post?.poll, post?.id));
  const [pollSelection, setPollSelection] = useState(null);
  const [pollSaving, setPollSaving] = useState(false);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    if (pollData && typeof pollData === "object") {
      setPollState((prev) => {
        if (prev?.id === pollData.id && prev?.question === pollData.question) {
          return prev;
        }
        return pollData;
      });

      const votedOptionId = pollData.userVoteOptionId ?? pollData.user_vote_option_id ?? null;
      setPollSelection(votedOptionId);
      setPollError("");
      setPollSaving(false);
    } else if (!post?.poll) {
      setPollState(null);
      setPollSelection(null);
    }
  }, [pollData, post?.poll]);

  const pollOptions = Array.isArray(pollState?.options) ? pollState.options : [];
  const pollTotalVotes = Number(pollState?.totalVotes ?? pollState?.total_votes ?? 0) || 0;
  const pollVotedOptionId = pollState?.userVoteOptionId ?? pollState?.user_vote_option_id ?? null;
  const pollExpiresAt = pollState?.expiresAt ?? pollState?.expires_at ?? null;
  const isPollExpired = useMemo(() => {
    if (!pollExpiresAt) return false;
    return new Date(pollExpiresAt) < new Date();
  }, [pollExpiresAt]);

  const hasVoted = Boolean(pollState && (pollState.hasVoted ?? pollState.has_voted ?? pollVotedOptionId !== null));
  const showPollResults = hasVoted || isPollExpired;
  const selectedPollOptionId = pollSelection ?? pollVotedOptionId;

  // ========== POLL VOTE HANDLER - FIXED ==========
  async function handlePollVote(event, optionId = null) {
    event?.stopPropagation();

    if (!authUser?.loggedIn) {
      navigate("/login");
      return;
    }

    const pollId = pollState?.id ?? post?.poll?.id ?? post?.poll?.poll_id ?? post?.id;
    const selectedOptionId = optionId ?? selectedPollOptionId;

    if (!pollId) {
      setPollError("Poll data is not available.");
      return;
    }

    if (!selectedOptionId) {
      setPollError("Please select an option before voting.");
      return;
    }

    setPollSaving(true);
    setPollError("");

    try {
      const endpoint = `/api/polls/${pollId}/vote`;
      const response = await api.post(endpoint, {
        option_id: selectedOptionId,
        optionId: selectedOptionId,
      });

      const result = response.data?.data ?? response.data ?? {};
      const nextPoll = normalizePollData(result?.poll ?? result?.data?.poll ?? result?.data ?? result, post?.id);

      if (nextPoll) {
        const normalizedNextPoll = {
          ...nextPoll,
          hasVoted: true,
          has_voted: true,
          userVoteOptionId: nextPoll.userVoteOptionId ?? selectedOptionId,
          user_vote_option_id: nextPoll.user_vote_option_id ?? selectedOptionId,
        };
        setPollState(normalizedNextPoll);
        setPollSelection(normalizedNextPoll.userVoteOptionId ?? selectedOptionId);
      } else {
        setPollState((current) => {
          if (!current) return current;
          const rawOptions = current.options.map((opt) => {
            if (opt.id === selectedOptionId) {
              const updatedVotes = opt.votesCount + 1;
              return {
                ...opt,
                votesCount: updatedVotes,
                votes_count: updatedVotes,
              };
            }
            return opt;
          });

          const { options, totalVotes } = computePollPercentages(rawOptions);

          return {
            ...current,
            options,
            totalVotes,
            total_votes: totalVotes,
            hasVoted: true,
            has_voted: true,
            userVoteOptionId: selectedOptionId,
            user_vote_option_id: selectedOptionId,
          };
        });
      }
    } catch (error) {
      setPollError(error?.response?.data?.message || error.message || "Could not save your vote");
    } finally {
      setPollSaving(false);
    }
  }

  function handlePollOptionSelect(optionId, submitVote = false) {
    if (hasVoted) return;
    setPollSelection(optionId);
    setPollError("");
    if (submitVote) {
      handlePollVote(undefined, optionId);
    }
  }

  return (
    <article
      className="post-card"
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClickAgree}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const target = event.target;
        if (target?.closest?.("a,button,input,textarea,select,label")) return;
        event.preventDefault();
        if (clickable) navigate(postPath);
      }}
    >
      {shareToast && (
        <div className="post-toast">
          <FiCheck /> {shareToast}
        </div>
      )}

      {/* Instagram-style double-click Agree animation overlay */}
      {showAgreeAnim && (
        <div className="dbl-agree-overlay" aria-hidden="true">
          <FiThumbsUp className="dbl-agree-icon" />
        </div>
      )}

      {/* Header */}
      <div className="post-header">
        <div className="post-user">
          <Link to={profilePath} className="post-avatar-link">
            <UserAvatar user={user} name={user?.name || user?.username || "User"} size={compact ? 40 : 48} />
          </Link>
          <div className="post-user-info">
            <div className="post-user-name">
              <UserNameWithBadge user={user} name={user?.name} className="name-link" badgeSize={18} />
              {canFollowAuthor && (
                <button
                  type="button"
                  className={`follow-btn ${followState ? "following" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFollowToggle();
                  }}
                  disabled={followLoading}
                >
                  {followLoading ? "..." : followState ? "Following" : followBack ? "Follow Back" : "Follow"}
                </button>
              )}
            </div>
            <div className="post-user-meta">
              {isGloballyPinned && (
          <span>
              {/* <FiStar size={12} /> Featured Post */}
          </span>
        )}
        {isPinned && !isGloballyPinned && showPinnedBadge && (
            <span className="pinned-badge">
                <FiBookmark size={12} /> Pinned Post
            </span>
        )}
              <UserNameWithBadge user={user} name={user?.username} showAt className="username-link" showBadge={false} />
              <span className="meta-separator">•</span>
              <span>{user?.village}</span>
              <span className="meta-separator">•</span>
              <span className="post-date">{formatDate(post.createdAt)}</span>
              <span className="meta-separator">•</span>
              <span className="post-category">{post.category}</span>
            </div>
          </div>
        </div>

        {/* 3 DOT MENU BUTTON */}
        <div ref={menuRef} className="post-menu-wrapper">
          <button
            ref={menuButtonRef}
            className="menu-btn"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const nextOpen = !menuOpen;
              setMenuOpen(nextOpen);
              if (!menuOpen) {
                updateMenuPosition();
              }
            }}
            aria-label="Open post actions"
            aria-expanded={menuOpen}
          >
            <FiMoreVertical />
          </button>

          {menuOpen && (
            <ModalPortal>
                <div
                    ref={menuContentRef}
                    className="menu-dropdown"
                    style={{
                        position: "fixed",
                        top: menuPosition.top,
                        left: menuPosition.left,
                    }}
                >
                    <button type="button" className="menu-item" onClick={() => { setShareOpen(true); setMenuOpen(false); }}>
                        <FiShare2 /> Share Post
                    </button>
                    <button type="button" className="menu-item" onClick={() => { setCommentsOpen((prev) => !prev); setMenuOpen(false); }}>
                        <FiMessageSquare /> {commentsOpen ? "Close Comments" : "Open Comments"}
                    </button>
                    {isOwnPost ? (
                        <>
                            {isPinned ? (
                                <button type="button" className="menu-item" onClick={async () => {
                                    try {
                                        await api.delete(`/api/posts/${post.id}/pin`);
                                        setIsPinned(false);
                                    } catch (err) {
                                        setActionError(err?.response?.data?.message || "Failed to unpin post");
                                    }
                                    setMenuOpen(false);
                                }}>
                                    <FiBookmark /> Unpin Post
                                </button>
                            ) : (
                                <button type="button" className="menu-item" onClick={async () => {
                                    try {
                                        await api.post(`/api/posts/${post.id}/pin`);
                                        setIsPinned(true);
                                    } catch (err) {
                                        setActionError(err?.response?.data?.message || "Failed to pin post");
                                    }
                                    setMenuOpen(false);
                                }}>
                                    <FiBookmark /> Pin Post
                                </button>
                            )}
                            {isAdmin && (
                                isGloballyPinned ? (
                                    <button type="button" className="menu-item" onClick={async () => {
                                        try {
                                            await api.delete(`/api/posts/${post.id}/global-pin`);
                                            setIsGloballyPinned(false);
                                        } catch (err) {
                                            setActionError(err?.response?.data?.message || "Failed to unpin globally");
                                        }
                                        setMenuOpen(false);
                                    }}>
                                        <FiStar /> Unpin Globally
                                    </button>
                                ) : (
                                    <button type="button" className="menu-item" onClick={async () => {
                                        try {
                                            await api.post(`/api/posts/${post.id}/global-pin`);
                                            setIsGloballyPinned(true);
                                        } catch (err) {
                                            setActionError(err?.response?.data?.message || "Failed to pin globally");
                                        }
                                        setMenuOpen(false);
                                    }}>
                                        <FiStar /> Pin Globally
                                    </button>
                                )
                            )}
                            <button type="button" className="menu-item" onClick={openEditModal}>
                                <FiCheck /> Edit Post
                            </button>
                            {isAdmin && (
                                <button type="button" className="menu-item" onClick={handleToggleHidden}>
                                    <FiCheck /> {isHidden ? "Show Post" : "Hide Post"}
                                </button>
                            )}
                            <button type="button" className="menu-item delete-item" onClick={() => { confirmDeletePost(); setMenuOpen(false); }}>
                                <FiTrash2 /> Delete Post
                            </button>
                            {actionError && <div className="menu-error">{actionError}</div>}
                            {actionMessage && <div className="menu-success">{actionMessage}</div>}
                        </>
                    ) : (
                        <>
                            {isAdmin && (
                                isGloballyPinned ? (
                                    <button type="button" className="menu-item" onClick={async () => {
                                        try {
                                            await api.delete(`/api/posts/${post.id}/global-pin`);
                                            setIsGloballyPinned(false);
                                        } catch (err) {
                                            setActionError(err?.response?.data?.message || "Failed to unpin globally");
                                        }
                                        setMenuOpen(false);
                                    }}>
                                        <FiStar /> Unpin Globally
                                    </button>
                                ) : (
                                    <button type="button" className="menu-item" onClick={async () => {
                                        try {
                                            await api.post(`/api/posts/${post.id}/global-pin`);
                                            setIsGloballyPinned(true);
                                        } catch (err) {
                                            setActionError(err?.response?.data?.message || "Failed to pin globally");
                                        }
                                        setMenuOpen(false);
                                    }}>
                                        <FiStar /> Pin Globally
                                    </button>
                                )
                            )}
                            <button type="button" className="menu-item" onClick={() => { setReportOpen(true); setMenuOpen(false); }}>
                                <FiAlertTriangle /> Report Post
                            </button>
                        </>
                    )}
                    <Link to={profilePath} className="menu-item" onClick={() => setMenuOpen(false)}>
                        <FiUser /> View Profile
                    </Link>
                </div>
            </ModalPortal>
        )}
        </div>
      </div>

      {/* Content */}
      <div className="post-content-body">
        {/* {postType === "poll" && pollData?.question ? (
          <strong className="poll-question">{pollData.question}</strong>
        ) : null} */}
        {postType !== "poll" && post.content && (
          <div className="post-text">{renderPostContent(post.content)}</div>
        )}
      </div>

      {/* Images */}
      {imageItems.length > 0 && (
        <div className="post-images">
          {imageItems.map((item, index) => (
            <img
              key={`${item.imageUrl || index}`}
              src={resolveMediaUrl(item.imageUrl || item.image_url || "")}
              alt={item.altText || item.alt_text || `Post image ${index + 1}`}
              className="post-image"
            />
          ))}
        </div>
      )}

      {/* Poll */}
      {postType === "poll" && pollState && pollOptions.length > 0 && (
  <div className="post-poll" key={`poll-${pollState.id || post.id}`}>

          <strong className="poll-question">{pollState?.question || "Poll"}</strong>
          
          {/* Debug info - remove after testing */}
          {/* <div style={{ fontSize: '12px', color: '#666', background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px' }}>
            Poll ID: {pollState?.id || 'N/A'} | Has Voted: {String(hasVoted)} | Options: {pollOptions.length}
          </div> */}

          {isPollExpired && pollExpiresAt && (
            <div className="poll-status-message ended">
              This poll has ended. Voting closed on {new Date(pollExpiresAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </div>
          )}
          {!isPollExpired && pollExpiresAt && (
            <div className="poll-status-message active">
              Ends on {new Date(pollExpiresAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          
          {!showPollResults ? (
            <div className="poll-options">
              {pollOptions.map((option) => {
                const optionId = option.id || option.optionId || option.option_id;
                const isSelected = String(selectedPollOptionId ?? "") === String(optionId ?? "");
                const inputId = `poll-${pollState?.id || "post"}-option-${optionId}`;
                return (
                  <label 
                    key={optionId || option.optionText || option.option_text} 
                    className={`poll-option ${isSelected ? "selected" : ""}`}
                    htmlFor={inputId}
                    onClick={() => handlePollOptionSelect(optionId)}
                  >
                    <input
                      type="radio"
                      id={inputId}
                      name={`poll-${pollState?.id || "post"}`}
                      value={optionId}
                      checked={isSelected}
                      onChange={() => handlePollOptionSelect(optionId)}
                      disabled={hasVoted || pollSaving}
                    />
                    <span className="poll-option-text">{option.optionText || option.option_text}</span>
                  </label>
                );
              })}
              {pollError && <div className="poll-error">{pollError}</div>}
              <button
                type="button"
                className="poll-vote-btn"
                onClick={handlePollVote}
                disabled={pollSaving || !selectedPollOptionId || !authUser?.loggedIn || isPollExpired}
              >
                {isPollExpired ? "Ended" : !authUser?.loggedIn ? "Login to vote" : pollSaving ? "Voting..." : "Vote"}
              </button>
            </div>
          ) : (
            <div className="poll-results">
              {pollOptions.map((option) => {
                const optionId = option.id || option.optionId || option.option_id;
                const votes = Number(option.votesCount ?? option.votes_count ?? 0) || 0;
                 const percent = option.percentage ?? option.percent ?? 0;
                const isSelected = String(pollVotedOptionId ?? "") === String(optionId ?? "");
                return (
                  <div key={optionId || option.optionText || option.option_text} className={`poll-result ${isSelected ? "selected" : ""}`}>
                    <div className="poll-result-label">
                      <span>{option.optionText || option.option_text}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="poll-result-bar">
                      <div className="poll-result-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="poll-total-votes">{formatCount(pollTotalVotes)} votes</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="post-actions">
        <button
          className={`action-btn agree-btn ${reactionTone.agree ? "active" : ""}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleReaction("agree");
          }}
        >
          <FiThumbsUp />
          <span className="action-label">Agree</span>
          <span className="action-count">{formatCount(counts.agrees)}</span>
        </button>
        <button
          className={`action-btn disagree-btn ${reactionTone.disagree ? "active" : ""}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleReaction("disagree");
          }}
        >
          <FiThumbsDown />
          <span className="action-label">Disagree</span>
          <span className="action-count">{formatCount(counts.disagrees)}</span>
        </button>
        <button
          className="action-btn comment-btn"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setCommentsOpen((value) => !value);
          }}
        >
          <FiMessageCircle />
          <span className="action-label">Comment</span>
          <span className="action-count">{formatCount(counts.comments)}</span>
        </button>
        <button
          className="action-btn share-btn"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShareOpen(true);
          }}
        >
          <FiShare2 />
          <span className="action-label">Share</span>
          <span className="action-count">{formatCount(counts.shares)}</span>
        </button>
      </div>

      {/* Comments Inline */}
      {commentsOpen && (
        <div ref={commentsContainerRef} className="comments-section" onClick={(e) => e.stopPropagation()}>
          <div className="comments-header">
            <span className="comments-title">Comments ({formatCount(counts.comments)})</span>
            <button type="button" className="close-comments" onClick={() => setCommentsOpen(false)}>
              <FiX size={18} />
            </button>
          </div>

          <div className="comment-input-wrapper">
            <form onSubmit={handleSubmitComment} className="comment-form">
              <div className="comment-input-container">
                <textarea
                  ref={commentInputRef}
                  className="comment-textarea"
                  rows={2}
                  value={commentText}
                  onChange={(event) => updateMainCommentText(event.target.value)}
                  onKeyUp={(event) => event.stopPropagation()}
                  placeholder="Write a comment... (type to see suggestions)"
                  disabled={commentSaving}
                />
                <button
                  type="submit"
                  className="comment-submit"
                  disabled={commentSaving || !commentText.trim()}
                >
                  {commentSaving ? "..." : "Post"}
                </button>

                {showSuggestions && suggestions.length > 0 && (
                  <ModalPortal>
                    <div
                      ref={suggestionsRef}
                      className="suggestions-dropdown suggestions-dropdown--portal"
                      style={{
                        position: "fixed",
                        bottom: window.innerHeight - dropdownPos.top + 6,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                      }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`suggestion-item ${selectedSuggestionIndex === index ? "active" : ""}`}
                          onClick={() => {
                            setCommentText(suggestion);
                            setShowSuggestions(false);
                            setSuggestions([]);
                            commentInputRef.current?.focus();
                          }}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </ModalPortal>
                )}
              </div>
              {commentError && <div className="comment-error">{commentError}</div>}
            </form>
          </div>

          <div className="comments-list">
            {commentsLoading ? (
              <div className="comments-loading">Loading comments...</div>
            ) : comments.length > 0 ? (
              comments.map((comment) => renderCommentItem(comment))
            ) : (
              <div className="no-comments">No comments yet. Be the first!</div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {shareOpen && (
        <ModalPortal>
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-header">
                <strong>Share post</strong>
                <button type="button" className="modal-close" onClick={() => setShareOpen(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <button type="button" className="share-btn" onClick={copyPostLink}>
                  <FiCopy /> Copy Link
                </button>
                <button type="button" className="share-btn whatsapp" onClick={shareOnWhatsApp}>
                  <FiShare2 /> WhatsApp Share
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {reportOpen && (
        <ModalPortal>
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-header">
                <strong>Report post</strong>
                <button type="button" className="modal-close" onClick={() => setReportOpen(false)}>
                  <FiX />
                </button>
              </div>
              <form className="modal-body" onSubmit={handleReportSubmit}>
                <div className="report-grid">
                  {reportReasons.map((reason) => (
                    <label key={reason} className={`report-chip ${reportReason === reason ? "active" : ""}`}>
                      <input type="radio" name="report_reason" value={reason} checked={reportReason === reason} onChange={() => setReportReason(reason)} />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
                {reportReason === "Other" && (
                  <div className="report-custom">
                    <textarea
                      className="report-textarea"
                      rows={4}
                      value={reportCustomReason}
                      onChange={(event) => setReportCustomReason(event.target.value)}
                      placeholder="Tell us what happened"
                    />
                    <div className="report-word-count">Max 50 words. Current: {countWords(reportCustomReason)}</div>
                  </div>
                )}
                {reportError && <div className="report-error">{reportError}</div>}
                <div className="report-actions">
                  <button type="button" className="btn-cancel" onClick={() => setReportOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={reportSaving}>
                    {reportSaving ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmationModal
        open={deleteConfirmOpen}
        title="Delete post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete post"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await handleDeletePost();
        }}
        onClose={() => setDeleteConfirmOpen(false)}
        loading={actionLoading}
      />

      <ConfirmationModal
        open={Boolean(deleteCommentTarget)}
        title="Delete comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          const target = deleteCommentTarget;
          if (target) handleDeleteComment(target.id);
        }}
        onClose={() => setDeleteCommentTarget(null)}
        loading={deletingCommentIds.size > 0}
      />

      {editOpen && (
        <ModalPortal>
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-header">
                <strong>Edit post</strong>
                <button type="button" className="modal-close" onClick={() => setEditOpen(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="edit-field">
                  <label>Post content</label>
                  <MentionTextarea
                    className="edit-field"
                    textareaClassName="edit-textarea"
                    rows={6}
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Update your post content"
                    disabled={editSaving}
                  />
                </div>
                <div className="edit-field">
                  <label>Category</label>
                  {categoriesLoading ? (
                    <div className="loading-text">Loading categories...</div>
                  ) : (
                    <select className="edit-select" value={editCategory} onChange={(event) => setEditCategory(event.target.value)} disabled={editSaving}>
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id || category.name} value={category.id ?? category.name}>
                          {category.name || category}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {editError && <div className="edit-error">{editError}</div>}
                <div className="edit-actions">
                  <button type="button" className="btn-cancel" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</button>
                  <button type="button" className="btn-save" onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <SuccessModal
        open={messageModal.open && messageModal.type === "success"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />
      <ErrorModal
        open={messageModal.open && messageModal.type === "danger"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />
      <InfoModal
        open={messageModal.open && messageModal.type === "info"}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal((prev) => ({ ...prev, open: false }))}
      />

      <style>{`
        .post-card {
          background: var(--bg-solid);
          border-radius: 16px;
          border: 1px solid var(--line);
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: visible;
        }
        .post-card:hover {
          border-color: rgba(var(--brand-2-rgb), 0.15);
        }

        /* Header */
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }
        .post-user {
          display: flex;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .post-avatar-link {
          flex-shrink: 0;
          text-decoration: none;
        }
        .post-user-info {
          min-width: 0;
          flex: 1;
        }
        .post-user-name {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .name-link {
          font-weight: 800;
          text-decoration: none;
          color: var(--text);
          font-size: 15px;
        }
        .name-link:hover {
          text-decoration: underline;
        }
        .verified-badge {
          flex-shrink: 0;
        }

        /* ===== INSTAGRAM-STYLE FOLLOW BUTTON ===== */
        .follow-btn {
          padding: 4px 16px;
          border-radius: 8px;
          border: none;
          background: var(--brand-2);
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: none;
        }

        .follow-btn:hover {
          background: var(--brand-2);
          filter: brightness(0.9);
        }

        .follow-btn:active {
          transform: scale(0.96);
        }

        .follow-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Unfollow state */
        .follow-btn.following {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--line);
        }

        .follow-btn.following:hover {
          background: rgba(var(--danger-rgb), 0.04);
          border-color: var(--danger);
          color: var(--danger);
        }
        /* ===== END ===== */

        .post-user-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--text-secondary);
          opacity: 0.7;
        }
        .username-link {
          text-decoration: none;
          color: inherit;
          font-weight: 600;
        }
        .username-link:hover {
          text-decoration: underline;
        }
        .meta-separator {
          opacity: 0.3;
        }
        .post-date, .post-category {
          font-size: 12px;
        }

        /* Menu */
        .post-menu-wrapper {
          position: relative;
          flex-shrink: 0;
          z-index: 10;
        }
        .menu-btn {
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 8px;
          display: flex !important;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: background 0.2s ease;
        }
        .menu-btn:hover {
          background: rgba(0,0,0,0.05);
        }
        .menu-dropdown {
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 12px;
          min-width: 180px;
          width: 200px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          z-index: 1202;
          padding: 4px;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          width: 100%;
          border: none;
          background: none;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          border-radius: 8px;
          transition: background 0.15s ease;
          text-decoration: none;
          font-family: inherit;
        }
        .menu-item:hover {
          background: rgba(var(--brand-2-rgb), 0.06);
        }
        .menu-item.delete-item:hover {
          background: rgba(var(--danger-rgb), 0.08);
          color: var(--danger);
        }
        .menu-error { color: var(--danger); font-size: 13px; padding: 4px 14px; }
        .menu-success { color: var(--success); font-size: 13px; padding: 4px 14px; }

        /* Content */
        .post-content-body {
          font-size: 15px;
          line-height: 1.6;
        }
        .post-text {
          white-space: pre-wrap;
        }
        .mention-link {
          color: var(--brand-2);
          text-decoration: none;
        }
        .mention-link:hover {
          text-decoration: underline;
        }
        .poll-question {
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
        }

        /* Images */
        .post-images {
          display: grid;
          gap: 10px;
        }
        .post-image {
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--line);
          object-fit: cover;
          max-height: 500px;
        }

        /* Poll */
        .post-poll {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .poll-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .poll-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .poll-option:hover {
          border-color: rgba(var(--brand-2-rgb), 0.3);
        }
        .poll-option.selected {
          border-color: var(--brand-2);
          background: rgba(var(--brand-2-rgb), 0.06);
        }
        .poll-option input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: var(--brand-2);
          margin: 0;
          flex-shrink: 0;
        }
        .poll-option-text {
          font-weight: 500;
        }
        .poll-vote-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--brand-2), var(--brand));
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: fit-content;
        }
        .poll-vote-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(var(--brand-2-rgb), 0.3);
        }
        .poll-vote-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .poll-status-message {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .poll-status-message.ended {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .poll-status-message.active {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .poll-error { color: var(--danger); font-size: 13px; }
        .poll-results {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .poll-result {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.02);
        }
        .poll-result.selected {
          border-color: var(--brand-2);
          background: rgba(var(--brand-2-rgb), 0.06);
        }
        .poll-result-label {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
          margin-bottom: 6px;
          font-size: 14px;
        }
        .poll-result-bar {
          width: 100%;
          height: 8px;
          border-radius: 99px;
          background: var(--line);
          overflow: hidden;
        }
        .poll-result-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, var(--brand-2), var(--brand));
          transition: width 0.3s ease;
        }
        .poll-result.selected .poll-result-fill {
          background: linear-gradient(90deg, var(--brand), var(--brand-2));
        }
        .poll-total-votes {
          font-size: 13px;
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .featured-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 8px;
          background: rgba(var(--brand-2-rgb), 0.1);
          color: var(--brand-2);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          margin-right: 4px;
        }
        .pinned-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(var(--warning-rgb), 0.1);
          color: var(--warning);
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
        }

        /* Actions */
        .post-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .action-btn:hover {
          background: rgba(0,0,0,0.04);
        }
        .action-btn.active {
          color: var(--brand-2);
        }
        .action-btn.active svg {
          fill: var(--brand-2);
        }
        .action-btn.disagree-btn.active {
          color: var(--danger);
        }
        .action-btn.disagree-btn.active svg {
          fill: var(--danger);
        }
        .action-label {
          font-weight: 500;
          font-size: 13px;
          display: none;
        }

        @media (min-width: 768px) {
          .action-label {
            display: inline;
          }
        }

        .action-count {
          font-size: 12px;
          font-weight: 600;
          opacity: 0.6;
        }

        /* Comments */
        .comments-section {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 420px;
          overflow: hidden;
        }
        .comments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .comments-title {
          font-weight: 700;
          font-size: 14px;
        }
        .close-comments {
          padding: 4px 8px;
          border: none;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
        }
        .close-comments:hover {
          background: rgba(0,0,0,0.05);
        }
        .comment-input-wrapper {
          flex-shrink: 0;
        }
        .comment-form {
          width: 100%;
        }
        .comment-input-container {
          position: relative;
          width: 100%;
        }
        .comment-textarea {
          width: 100%;
          padding: 10px 70px 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 44px;
          max-height: 100px;
          transition: border-color 0.2s ease;
        }
        .comment-textarea:focus {
          outline: none;
          border-color: rgba(var(--brand-2-rgb), 0.4);
          box-shadow: 0 0 0 3px rgba(var(--brand-2-rgb), 0.08);
        }
        .comment-submit {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 4px 14px;
          border: none;
          border-radius: 20px;
          background: var(--brand-2);
          color: white;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .comment-submit:hover:not(:disabled) {
          background: var(--brand-2);
          filter: brightness(0.9);
        }
        .comment-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .suggestions-dropdown {
          max-height: 220px;
          overflow-y: auto;
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          z-index: 9999;
          padding: 6px;
        }
        .suggestions-dropdown--portal {
          position: fixed !important;
        }
        .suggestions-dropdown::-webkit-scrollbar { width: 4px; }
        .suggestions-dropdown::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 10px;
        }
        .suggestion-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: none;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          transition: background 0.15s ease;
          font-family: inherit;
        }
        .suggestion-item:hover,
        .suggestion-item.active {
          background: rgba(var(--brand-2-rgb), 0.08);
        }
        .comment-error {
          color: var(--danger);
          font-size: 13px;
          margin-top: 4px;
        }
        .comments-list {
          flex: 1;
          overflow-y: auto;
          max-height: 260px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
        }
        .comments-list::-webkit-scrollbar { width: 4px; }
        .comments-list::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 10px;
        }
        .comments-loading, .no-comments {
          padding: 12px 0;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .comment-item {
          display: flex;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
        }
        .comment-thread {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .comment-thread.is-reply {
          margin-left: 34px;
        }
        .comment-item.is-deleted {
          opacity: 0.75;
        }
        .comment-item:hover {
          background: rgba(255,255,255,0.04);
        }
        .comment-avatar {
          flex-shrink: 0;
          text-decoration: none;
        }
        .comment-body {
          flex: 1;
          min-width: 0;
        }
        .comment-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .comment-meta-actions {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .comment-author {
          font-weight: 700;
          font-size: 14px;
        }
        .comment-date {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .comment-delete {
          padding: 4px;
          border: none;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 4px;
          margin-left: auto;
        }
        .comment-delete:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }
        .comment-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 6px;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .comment-icon-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text);
        }
        .comment-icon-btn.danger:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }
        .comment-text {
          margin-top: 4px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .comment-text.deleted-text {
          color: var(--text-secondary);
          font-style: italic;
        }
        .comment-actions-row,
        .comment-inline-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .comment-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          border: none;
          background: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
        }
        .comment-link-btn:hover,
        .comment-link-btn.active,
        .comment-link-btn.primary {
          color: var(--brand-2);
        }
        .comment-link-btn.danger,
        .comment-link-btn.active.danger {
          color: var(--danger);
        }
        .comment-link-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .comment-textarea.compact {
          min-height: 54px;
          max-height: 92px;
          padding: 9px 11px;
          margin-top: 6px;
        }
        .comment-edit-form,
        .reply-form {
          margin-top: 6px;
        }
        .replying-to {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .view-replies-btn {
          margin-top: 8px;
          padding: 0;
          border: none;
          background: none;
          color: var(--brand-2);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }
        .replies-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Toast */
        .post-toast {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 99px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          font-weight: 700;
          font-size: 13px;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== DOUBLE-CLICK AGREE ANIMATION ===== */
        @keyframes dblAgreeAnim {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.3); }
          30%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.35); }
          55%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(0.85); }
        }
        .dbl-agree-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          border-radius: inherit;
        }
        .dbl-agree-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          animation: dblAgreeAnim 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          width: 80px;
          height: 80px;
          color: var(--brand-2);
          filter: drop-shadow(0 4px 28px rgba(var(--brand-2-rgb), 0.65));
          flex-shrink: 0;
        }
        /* ===== END DOUBLE-CLICK AGREE ===== */

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
        }
        .modal-card {
          width: min(600px, 100%);
          border-radius: 20px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          padding: 20px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalIn 0.2s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .modal-header strong {
          font-size: 18px;
        }
        .modal-close {
          padding: 4px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 20px;
          color: var(--text-secondary);
          border-radius: 6px;
        }
        .modal-close:hover {
          background: rgba(0,0,0,0.05);
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .share-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: none;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .share-btn:hover {
          background: rgba(37, 99, 235, 0.06);
          border-color: rgba(37, 99, 235, 0.3);
        }
        .share-btn.whatsapp:hover {
          background: rgba(37, 211, 102, 0.08);
          border-color: rgba(37, 211, 102, 0.3);
          color: #25d366;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 8px;
        }
        .report-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        .report-chip:hover {
          border-color: rgba(37, 99, 235, 0.3);
        }
        .report-chip.active {
          border-color: #3b82f6;
          background: rgba(37, 99, 235, 0.06);
        }
        .report-chip input {
          margin: 0;
          accent-color: #3b82f6;
        }
        .report-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
        }
        .report-textarea:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.4);
        }
        .report-word-count {
          font-size: 12px;
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .report-error {
          color: #ef4444;
          font-size: 13px;
        }
        .report-actions,
        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-cancel {
          padding: 8px 18px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: none;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .btn-cancel:hover {
          background: rgba(0,0,0,0.04);
        }
        .btn-submit,
        .btn-save {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .btn-submit:hover:not(:disabled),
        .btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
        }
        .btn-submit:disabled,
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .edit-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .edit-field label {
          font-weight: 600;
          font-size: 14px;
        }
        .edit-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
        }
        .edit-textarea:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.4);
        }
        .edit-select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
        }
        .edit-select:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.4);
        }
        .edit-error {
          color: #ef4444;
          font-size: 13px;
        }
        .loading-text {
          color: var(--text-secondary);
          font-size: 14px;
          opacity: 0.6;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .post-card {
            padding: 12px 14px;
            border-radius: 12px;
          }
          .action-btn {
            padding: 6px 10px;
            font-size: 13px;
          }
          .action-count {
            font-size: 11px;
          }
          .comments-section {
            max-height: 360px;
          }
          .comments-list {
            max-height: 160px;
          }
          .comment-item {
            padding: 6px 8px;
          }
          .report-grid {
            grid-template-columns: 1fr;
          }
          .modal-card {
            padding: 16px;
          }
          .post-user-meta {
            font-size: 12px;
          }
          .name-link {
            font-size: 14px;
          }
          .post-content-body {
            font-size: 14px;
          }
          .menu-btn {
            font-size: 18px;
            width: 32px;
            height: 32px;
          }
          .follow-btn {
            padding: 3px 12px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .post-card {
            padding: 10px 12px;
            border-radius: 10px;
          }
          .post-actions {
            gap: 4px;
          }
          .action-btn {
            padding: 4px 8px;
            font-size: 12px;
          }
          .action-count {
            font-size: 10px;
          }
          .comments-section {
            max-height: 320px;
          }
          .comments-list {
            max-height: 140px;
          }
          .post-user-name {
            font-size: 13px;
          }
          .post-user-meta {
            font-size: 11px;
          }
          .follow-btn {
            font-size: 10px;
            padding: 2px 10px;
          }
          .menu-dropdown {
            min-width: 160px;
            width: 180px;
          }
          .menu-item {
            font-size: 13px;
            padding: 8px 12px;
          }
          .menu-btn {
            font-size: 16px;
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </article>
  );
}
