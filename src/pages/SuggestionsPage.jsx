
import { useEffect, useState } from "react";
import { FiUsers, FiArrowLeft } from "react-icons/fi";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import SectionCard from "../components/common/SectionCard";
import UserAvatar from "../components/ui/UserAvatar";
import UserNameWithBadge from "../components/ui/UserNameWithBadge";
import EmptyState from "../components/ui/EmptyState";

export default function SuggestionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followState, setFollowState] = useState({});

  useEffect(() => {
    if (!user.loggedIn) return;

    const fetchSuggestions = async () => {
      setLoading(true);

      try {
        const response = await api.get("/api/users");
        const allUsers = Array.isArray(response.data?.data ?? response.data) ? (response.data?.data ?? response.data) : [];
        
        const eligibleUsers = allUsers.filter(u => {
          if (String(u.id) === String(user.id)) return false;
          if (u.is_hidden || u.is_suspended || u.is_deleted || u.deleted_at) return false;

          const userVillageId = String(user.village_id ?? user.villageId ?? "");
          const uVillageId = String(u.village_id ?? u.villageId ?? "");
          if (userVillageId && uVillageId && userVillageId !== uVillageId) return false;

          return true;
        });

        setSuggestions(eligibleUsers.sort(() => Math.random() - 0.5));
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user.id, user.loggedIn, user.village_id, user.villageId]);

  useEffect(() => {
    if (!user.loggedIn) return;
    const initialState = {};
    if (user.following && Array.isArray(user.following)) {
      user.following.forEach(id => {
        initialState[String(id)] = true;
      });
    }
    setFollowState(initialState);
  }, [user]);

  const handleFollow = async (targetUser) => {
    const userId = String(targetUser.id);
    const wasFollowing = followState[userId];

    setFollowState(prev => ({ ...prev, [userId]: !wasFollowing }));

    try {
      if (wasFollowing) {
        await api.delete(`/api/users/${userId}/unfollow`);
      } else {
        await api.post(`/api/users/${userId}/follow`);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setFollowState(prev => ({ ...prev, [userId]: wasFollowing }));
    }
  };

  if (!user.loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="suggestions-page">
      <SectionCard>
        <div className="suggestions-page-header">
          <button className="back-button" onClick={() => navigate("/")}>
            <FiArrowLeft size={20} />
          </button>
          <div className="suggestions-page-title">
            <FiUsers size={22} />
            People From Your Village
          </div>
        </div>
        <div className="suggestions-page-list">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="suggestions-page-item skeleton">
                <div className="skeleton-avatar" />
                <div className="skeleton-info">
                  <div className="skeleton-name" />
                  <div className="skeleton-sub" />
                </div>
                <div className="skeleton-button" />
              </div>
            ))
          ) : !suggestions.length ? (
            <EmptyState title="No suggestions available" message="Check back later for new people from your village!" />
          ) : (
            suggestions.map(u => (
              <div key={u.id} className="suggestions-page-item">
                <Link 
                  to={`/profile/${u.username || u.id}`} 
                  style={{ textDecoration: "none", color: "inherit" }}
                  className="suggestions-page-user-link"
                >
                  <UserAvatar user={u} name={u.name || u.username} size={56} />
                  <div className="suggestions-page-user-info">
                <UserNameWithBadge 
                  user={u} 
                  name={u.name || u.username} 
                  link={false} 
                  badgeSize={14}
                />
              </div>
                </Link>
                <button
                  className={`suggestions-page-follow-button ${followState[String(u.id)] ? "following" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleFollow(u);
                  }}
                >
                  {followState[String(u.id)] ? "Following" : "Follow"}
                </button>
              </div>
            ))
          )}
        </div>
      </SectionCard>
      <style>{`
        .suggestions-page {
          padding-top: 12px;
        }
        
        .suggestions-page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .back-button:hover {
          background: rgba(37, 99, 235, 0.08);
          border-color: rgba(37, 99, 235, 0.2);
        }
        
        .suggestions-page-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 18px;
          color: var(--text);
        }
        
        .suggestions-page-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .suggestions-page-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        
        .suggestions-page-user-link {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .suggestions-page-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .suggestions-page-name {
          display: inline-flex;
          align-items: center;
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
        }
        
        .suggestions-page-follow-button {
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          transition: all 0.2s ease;
        }
        
        .suggestions-page-follow-button.following {
          background: rgba(37, 99, 235, 0.1);
          color: var(--brand-2);
          border: 1px solid rgba(37, 99, 235, 0.2);
        }
        
        .suggestions-page-follow-button.following:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          border-color: rgba(220, 38, 38, 0.2);
        }
        
        /* Skeleton styling */
        .suggestions-page-item.skeleton {
          pointer-events: none;
        }
        
        .skeleton-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
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
          width: 140px;
          height: 16px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--line) 25%, rgba(var(--brand-2-rgb), 0.06) 50%, var(--line) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-sub {
          width: 100px;
          height: 12px;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--line) 25%, rgba(var(--brand-2-rgb), 0.06) 50%, var(--line) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-button {
          width: 85px;
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
      `}</style>
    </div>
  );
}
