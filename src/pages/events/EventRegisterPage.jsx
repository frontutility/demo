import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import SectionCard from "../../components/common/SectionCard";

const EVENT_CATEGORIES = [
  "Shop Opening",
  "Celebration",
  "Religious Program",
  "Social & Community Event",
  "Education & Sports",
  "Birthday Celebration",
  "Bhajan Sandhya",
  "Education Seminar",
  "Sports Event",
  "Blood Donation Camp",
  "Plantation Drive",
  "Cleanliness Campaign",
  "Cultural Program",
  "Public Meeting",
  "Wedding / Reception",
  "Anniversary",
  "Business Launch",
  "Exhibition / Fair",
  "Music Event",
  "Entertainment Event",
  "Social Awareness Program",
  "Coaching Seminar",
  "Other"
];

export default function EventRegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({
    event_title: "",
    category: "",
    organizer_name: "",
    organizer_phone: "",
    organizer_email: "",
    event_description: "",
    banner_image: "",
    event_date: "",
    start_time: "",
    end_time: "",
    venue_name: "",
    full_address: "",
    village_area: "",
    contact_person_1: "",
    contact_person_1_phone: "",
    contact_person_2: "",
    contact_person_2_phone: "",
    contact_person_3: "",
    contact_person_3_phone: "",
    whatsapp_number: "",
    social_links: { facebook: "", instagram: "", website: "" }
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.loggedIn) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/events", form);
      navigate("/");
    } catch (error) {
      console.error("Error creating event:", error);
      alert(error.response?.data?.message || "Error creating event");
    } finally {
      setLoading(false);
    }
  };

  if (!user?.loggedIn) {
    navigate("/login");
    return null;
  }

  return (
    <div className="event-register-page">
      <div className="event-register-container">
        {/* Step 1: Info Page */}
        {step === 1 && (
          <SectionCard>
            <div className="event-step-header text-center">
              <h1 className="event-step-title">Register Your Event</h1>
              <p className="event-step-subtitle">
                Neemkathana City और आसपास होने वाले सार్వजनिक कार्यक्रमों की जानकारी अब एक ही स्थान पर।
              </p>
            </div>

            <div className="event-categories-section">
              <h3 className="event-section-title">Supported Event Categories:</h3>
              <div className="event-categories-grid">
                {EVENT_CATEGORIES.map((cat, idx) => (
                  <span key={idx} className="event-category-chip">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div className="event-benefits-section">
              <h3 className="event-section-title">Benefits:</h3>
              <ul className="event-benefits-list">
                <li>Reach thousands of local users.</li>
                <li>Promote your event for free.</li>
                <li>Help local people discover upcoming programs.</li>
                <li>All published events appear in the Upcoming Events section.</li>
              </ul>
            </div>

            <div className="event-step-actions">
              <button className="btn btn-primary" onClick={handleNextStep}>
                Next Step
              </button>
            </div>
          </SectionCard>
        )}

        {/* Step 2: Rules & Confirmation */}
        {step === 2 && (
          <SectionCard>
            <h1 className="event-step-title">Important Information Before Publishing Your Event</h1>

            <div className="event-rules-box">
              <ul className="event-rules-list">
                <li>Only publish real and accurate event information.</li>
                <li>
                  Publishing fake, misleading, cancelled or incorrect event information may cause inconvenience or
                  financial loss to other people.
                </li>
                <li>
                  If any user intentionally publishes false information, fake events, misleading locations, incorrect
                  dates or any abusive content, the event may be removed immediately without notice.
                </li>
                <li>Repeated violations may permanently suspend or ban the user's account.</li>
                <li>The platform reserves the right to remove any event at any time.</li>
                <li>The person publishing the event is solely responsible for the accuracy of the information.</li>
              </ul>
            </div>

            <div className="event-agree-section">
              <label className="event-agree-label">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I confirm that all information provided by me is true and accurate. I understand that publishing false
                  or misleading information may permanently suspend my account.
                </span>
              </label>
            </div>

            <div className="event-step-actions">
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                Back
              </button>
              <button
                className={agree ? "btn btn-primary" : "btn btn-secondary"}
                onClick={handleNextStep}
                disabled={!agree}
              >
                Next Step
              </button>
            </div>
          </SectionCard>
        )}

        {/* Step 3: Form */}
        {step === 3 && (
          <SectionCard>
            <h1 className="event-step-title">Event Registration Form</h1>

            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label className="form-label">Event Title *</label>
                <input
                  required
                  className="field"
                  value={form.event_title}
                  onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  required
                  className="select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Organizer Name *</label>
                <input
                  required
                  className="field"
                  value={form.organizer_name}
                  onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Organizer Phone *</label>
                <input
                  required
                  className="field"
                  value={form.organizer_phone}
                  onChange={(e) => setForm({ ...form, organizer_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Organizer Email</label>
                <input
                  type="email"
                  className="field"
                  value={form.organizer_email}
                  onChange={(e) => setForm({ ...form, organizer_email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Description *</label>
                <textarea
                  required
                  className="textarea"
                  rows={4}
                  value={form.event_description}
                  onChange={(e) => setForm({ ...form, event_description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Banner Image URL *</label>
                <input
                  required
                  className="field"
                  value={form.banner_image}
                  onChange={(e) => setForm({ ...form, banner_image: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input
                  required
                  type="date"
                  className="field"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="field"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="field"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Venue Name *</label>
                <input
                  required
                  className="field"
                  value={form.venue_name}
                  onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Address *</label>
                <textarea
                  required
                  className="textarea"
                  rows={3}
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Village / Area *</label>
                <input
                  required
                  className="field"
                  value={form.village_area}
                  onChange={(e) => setForm({ ...form, village_area: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 1</label>
                <input
                  className="field"
                  value={form.contact_person_1}
                  onChange={(e) => setForm({ ...form, contact_person_1: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 1 Phone</label>
                <input
                  className="field"
                  value={form.contact_person_1_phone}
                  onChange={(e) => setForm({ ...form, contact_person_1_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 2</label>
                <input
                  className="field"
                  value={form.contact_person_2}
                  onChange={(e) => setForm({ ...form, contact_person_2: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 2 Phone</label>
                <input
                  className="field"
                  value={form.contact_person_2_phone}
                  onChange={(e) => setForm({ ...form, contact_person_2_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 3</label>
                <input
                  className="field"
                  value={form.contact_person_3}
                  onChange={(e) => setForm({ ...form, contact_person_3: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person 3 Phone</label>
                <input
                  className="field"
                  value={form.contact_person_3_phone}
                  onChange={(e) => setForm({ ...form, contact_person_3_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Number *</label>
                <input
                  required
                  className="field"
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                />
              </div>

              <div className="event-social-section">
                <h4 className="event-social-title">Social Media Links (Optional)</h4>
                <div className="form-group">
                  <label className="form-label">Facebook</label>
                  <input
                    className="field"
                    value={form.social_links.facebook}
                    onChange={(e) =>
                      setForm({ ...form, social_links: { ...form.social_links, facebook: e.target.value }})
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input
                    className="field"
                    value={form.social_links.instagram}
                    onChange={(e) =>
                      setForm({ ...form, social_links: { ...form.social_links, instagram: e.target.value }})
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    className="field"
                    value={form.social_links.website}
                    onChange={(e) =>
                      setForm({ ...form, social_links: { ...form.social_links, website: e.target.value }})
                    }
                  />
                </div>
              </div>

              <div className="event-step-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevStep}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Publish Event"}
                </button>
              </div>
            </form>
          </SectionCard>
        )}
      </div>

      <style>{`
        .event-register-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .event-register-container {
          width: 100%;
        }

        .text-center {
          text-align: center;
        }

        .event-step-header {
          margin-bottom: 30px;
        }

        .event-step-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: var(--text);
        }

        .event-step-subtitle {
          font-size: 18px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        .event-section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 15px 0;
          color: var(--text);
        }

        .event-categories-section,
        .event-benefits-section {
          margin-bottom: 30px;
        }

        .event-categories-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .event-category-chip {
          padding: 6px 12px;
          border-radius: 20px;
          background-color: var(--bg-solid);
          border: 1px solid var(--line);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .event-benefits-list {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin: 0;
          padding-left: 20px;
        }

        .event-rules-box {
          background-color: #fff3cd;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #ffecb5;
        }

        [data-theme="dark"] .event-rules-box {
          background-color: rgba(255, 193, 7, 0.1);
          border-color: rgba(255, 193, 7, 0.3);
        }

        .event-rules-list {
          line-height: 2;
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }

        [data-theme="dark"] .event-rules-list {
          color: var(--text);
        }

        .event-agree-section {
          margin-bottom: 20px;
        }

        .event-agree-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 16px;
          line-height: 1.5;
          color: var(--text);
        }

        .event-agree-label input {
          width: 20px;
          height: 20px;
          margin-top: 2px;
        }

        .event-step-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .event-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-label {
          font-weight: 500;
          color: var(--text);
        }

        .event-social-section {
          margin-bottom: 10px;
        }

        .event-social-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 10px 0;
          color: var(--text);
        }

        @media (max-width: 768px) {
          .event-register-page {
            padding: 12px;
          }

          .event-step-title {
            font-size: 24px;
          }

          .event-step-subtitle {
            font-size: 16px;
          }

          .event-rules-box {
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .event-register-page {
            padding: 8px;
          }

          .event-step-title {
            font-size: 20px;
          }

          .event-step-actions {
            flex-direction: column;
          }

          .event-step-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
