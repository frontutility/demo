import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const { user } = useAuth();

  const loadEvents = async () => {
    try {
      const params = new URLSearchParams({
        page,
        per_page: 20,
        search,
        category,
        status
      });
      const response = await api.get(`/api/admin/events?${params}`);
      setEvents(response.data?.data?.events || []);
      setTotalPages(response.data?.data?.pagination?.total_pages || 1);
      setTotal(response.data?.data?.pagination?.total || 0);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, search, category, status]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/api/admin/events/${id}`);
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  if (!user?.isAdmin) {
    return <div>Unauthorized</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: 20 }}>Events Management ({total})</h1>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 15, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by title, organizer, village, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ddd", flex: 1, minWidth: 250 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="">All Categories</option>
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Deleted">Deleted</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#fff"
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Banner</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Title</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Category</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Organizer</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Phone</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Date</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Village</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Created By</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Views</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Visible Until</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
                    <img
                      src={event.banner_image}
                      alt=""
                      style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 4 }}
                    />
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.event_title}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.category}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.organizer_name}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.organizer_phone}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.event_date}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.village_area}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
                    {event.user_name || event.user_username}
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.views}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
                    {new Date(event.frontend_visible_until).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>{event.status}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        borderRadius: 4,
                        border: "none",
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                      onClick={() => handleDelete(event.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #ddd" }}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #ddd" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
