import { useEffect, useRef, useState } from "react";
import { FiUsers, FiArrowRight } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import UserAvatar from "../ui/UserAvatar";
import UserNameWithBadge from "../ui/UserNameWithBadge";

// Session cache for suggestions
let suggestionsCache = null;
let cacheExpiry = 0;

export default function UserSuggestionsCarousel({ maxCards = 6 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Fetch suggestions (with caching)
  useEffect(() => {
    if (!user.loggedIn) return;

    const fetchSuggestions = async () => {
      const now = Date.now();
      // Cache for 5 minutes
      if (suggestionsCache && cacheExpiry > now) {
        setSuggestions(suggestionsCache);
        return;
      }

      setLoading(true);

      try {
        const response = await api.get("/api/users");
        const allUsers = Array.isArray(response.data?.data ?? response.data) ? (response.data?.data ?? response.data) : [];
        
        // Filter eligible users
        const eligibleUsers = allUsers.filter(u => {
          // Exclude logged-in user
          if (String(u.id) === String(user.id)) return false;
          
          // Exclude hidden/suspended/deleted
          if (u.is_hidden || u.is_suspended || u.is_deleted || u.deleted_at) return false;

          // Same village
          const userVillageId = String(user.village_id ?? user.villageId ?? "");
          const uVillageId = String(u.village_id ?? u.villageId ?? "");
          if (userVillageId && uVillageId && userVillageId !== uVillageId) return false;

          return true;
        });

        // Randomize order
        const shuffled = [...eligibleUsers].sort(() => Math.random() - 0.5);
        
        // Cache results
        suggestionsCache = shuffled;
        cacheExpiry = now + 300000; // 5 minutes
        
        setSuggestions(shuffled);
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user.id, user.loggedIn, user.village_id, user.villageId]);

  if (!user.loggedIn) return null;
  if (!suggestions.length && !loading) return null;

  return (
    <div className="user-suggestions-carousel">
      <div className="suggestions-header">
        <div className="suggestions-title">
          <FiUsers size={18} />
          People From Your Village
        </div>
        <button 
          className="suggestions-see-all"
          onClick={() => navigate("/suggestions")}
        >
          See All <FiArrowRight size={14} />
        </button>
      </div>
      <div className="suggestions-scroll" ref={scrollRef}>
        {loading ? (
          Array.from({ length: Math.min(maxCards, 5) }).map((_, i) => (
            <div key={i} className="suggestion-card skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-name" />
              <div className="skeleton-button" />
            </div>
          ))
        ) : (
          suggestions.slice(0, maxCards).map(u => (
            <div key={u.id} className="suggestion-card">
              <Link 
                to={`/profile/${u.username || u.id}`} 
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <UserAvatar user={u} name={u.name || u.username} size={56} />
              </Link>
              <div className="suggestion-info">
                <UserNameWithBadge 
                  user={u} 
                  name={u.name || u.username} 
                  link={false} 
                  badgeSize={14}
                />
              </div>
              <Link
                to={`/profile/${u.username || u.id}`}
                style={{ textDecoration: "none", width: "100%" }}
              >
                <button className="follow-button">
                  View Profile
                </button>
              </Link>
            </div>
          ))
        )}
      </div>
      <style>{`
        .user-suggestions-carousel {
          margin-bottom: 12px;
          padding: 12px 0;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }
        
        .suggestions-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 16px;
        }
        
        .suggestions-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
        }
        
        .suggestions-see-all {
          display: flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          color: var(--brand-2);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        
        .suggestions-see-all:hover {
          background: rgba(37, 99, 235, 0.08);
        }
        
        .suggestions-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 16px 8px 16px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          width: 100%;
          /* Ensure scroll is visible by making cards take minimum width */
        }
        
        .suggestions-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .suggestion-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px 12px;
          min-width: 140px;
          max-width: 140px;
          flex: 0 0 auto; /* Prevent cards from shrinking */
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 16px;
          transition: all 0.2s ease;
        }
        
        .suggestion-card:hover {
          border-color: rgba(var(--brand-2-rgb), 0.2);
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
        }
        
        .suggestion-info {
          text-align: center;
          width: 100%;
          overflow: hidden;
        }
        
        .suggestion-info > * {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .suggestion-name {
          display: inline-flex;
          align-items: center;
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .follow-button {
          width: 100%;
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        
        .follow-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
        
        .follow-button.following {
          background: rgba(37, 99, 235, 0.1);
          color: var(--brand-2);
          border: 1px solid rgba(37, 99, 235, 0.2);
        }
        
        .follow-button.following:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          border-color: rgba(220, 38, 38, 0.2);
        }
        
        .follow-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Skeleton styling */
        .suggestion-card.skeleton {
          pointer-events: none;
        }
        
        .skeleton-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(90deg, var(--line) 25%, rgba(var(--brand-2-rgb), 0.06) 50%, var(--line) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-name {
          width: 80px;
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, var(--line) 25%, rgba(var(--brand-2-rgb), 0.06) 50%, var(--line) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-button {
          width: 100%;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(90deg, var(--line) 25%, rgba(var(--brand-2-rgb), 0.06) 50%, var(--line) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}