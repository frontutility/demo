import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import { useApiResource } from "../../api/useApiResource";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

const CONTACT_CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "feedback", label: "Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },

  { value: "account", label: "Account Issue" },
  { value: "login", label: "Login Problem" },
  { value: "register", label: "Registration Problem" },
  { value: "password", label: "Password Reset" },

  { value: "suspended", label: "Account Suspended" },
  { value: "reactivate", label: "Account Reactivation" },
  { value: "delete_account", label: "Delete My Account" },
  { value: "profile_issue", label: "Profile Issue" },

  { value: "post_delete", label: "Post Deleted" },
  { value: "post_issue", label: "Post Problem" },
  { value: "comment_issue", label: "Comment Problem" },
  { value: "poll_issue", label: "Poll Issue" },

  { value: "follow_issue", label: "Follow/Unfollow Issue" },
  { value: "share_issue", label: "Share Issue" },
  { value: "notification_issue", label: "Notification Issue" },

  { value: "report_user", label: "Report User" },
  { value: "report_post", label: "Report Post" },
  { value: "abuse", label: "Abuse / Harassment" },
  { value: "fake_account", label: "Fake Account" },
  { value: "spam", label: "Spam Content" },

  { value: "privacy", label: "Privacy Concern" },
  { value: "security", label: "Security Issue" },
  { value: "data_request", label: "Data Request" },

  { value: "verification", label: "Blue Tick Verification" },
  { value: "advertisement", label: "Advertisement Inquiry" },
  { value: "business", label: "Business Partnership" },

  { value: "news", label: "News Submission" },
  { value: "village", label: "Village Information Update" },

  { value: "other", label: "Other" },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  category: "general",
  subject: "",
  message: "",
};

export default function ContactUsPage() {
  const { user } = useAuth();
  const { data: page, loading, error } = useApiResource("/api/cms/pages/contact-us", {
    initialData: null,
  });

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    name: user.loggedIn ? user.name || "" : "",
    email: user.loggedIn ? user.email || "" : "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user.loggedIn) {
      setForm((current) => ({
        ...current,
        name: user.name || current.name,
        email: user.email || current.email,
      }));
    }
  }, [user.loggedIn, user.name, user.email]);

  useEffect(() => {
    document.title = "ConnectNKT | Contact Us";
  }, []);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setErrorMessage("");
    setStatusMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setErrorMessage("");
    setStatusMessage("");

    try {
      await api.post("/api/contact-queries", {
        name: form.name,
        email: form.email,
        category: form.category,
        subject: form.subject,
        message: form.message,
      });

      setStatusMessage("Your message has been sent successfully. We will respond as soon as possible.");
      setForm((current) => ({
        ...INITIAL_FORM,
        category: current.category || "general",
        name: user.loggedIn ? user.name || "" : "",
        email: user.loggedIn ? user.email || "" : "",
      }));
    } catch (err) {
      const response = err?.response?.data;
      if (response?.errors && typeof response.errors === "object") {
        setErrors(response.errors);
        setErrorMessage(response.message || "Please fix the highlighted fields.");
      } else {
        setErrorMessage(response?.message || err.message || "Unable to send your message right now.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        title={page?.title || "Contact Us"}
        subtitle={page?.content ? "Send us a message and we will get back to you soon." : "Use this form to reach the ConnectNKT team."}
      />

      {loading ? (
        <SectionCard>
          <div className="stack">
            <div className="skeleton" style={{ height: 24, width: "50%" }} />
            <div className="skeleton" style={{ height: 160, width: "100%" }} />
          </div>
        </SectionCard>
      ) : (
        page?.content && (
          <SectionCard className="max-w-4xl mx-auto">
            <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
          </SectionCard>
        )
      )}

      <SectionCard title="Send a Message" className="max-w-4xl mx-auto">
        {errorMessage ? <EmptyState title="Submission error" message={errorMessage} /> : null}
        {statusMessage ? <EmptyState title="Message sent" message={statusMessage} /> : null}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="field"
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Your full name"
                disabled={saving}
              />
              {errors.name ? <div className="text-danger">{errors.name}</div> : null}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="field"
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="you@example.com"
                disabled={saving}
              />
              {errors.email ? <div className="text-danger">{errors.email}</div> : null}
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="field"
              value={form.category}
              onChange={(event) => handleChange("category", event.target.value)}
              disabled={saving}
            >
              {CONTACT_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category ? <div className="text-danger">{errors.category}</div> : null}
          </div>

          <div>
            <label className="label">Subject</label>
            <input
              className="field"
              type="text"
              value={form.subject}
              onChange={(event) => handleChange("subject", event.target.value)}
              placeholder="Brief description of your request"
              disabled={saving}
            />
            {errors.subject ? <div className="text-danger">{errors.subject}</div> : null}
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              className="textarea"
              rows={8}
              value={form.message}
              onChange={(event) => handleChange("message", event.target.value)}
              placeholder="Write your message here"
              disabled={saving}
            />
            {errors.message ? <div className="text-danger">{errors.message}</div> : null}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Sending..." : "Send Message"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
