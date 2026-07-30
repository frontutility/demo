import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiHeart } from "react-icons/fi";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";
import SkeletonCard from "../components/ui/SkeletonCard";
import EmptyState from "../components/ui/EmptyState";
import UserAvatar from "../components/ui/UserAvatar";
import api from "../services/api";

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AllSupportersPage() {
  const [data, setData] = useState({ supporters: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "Supporters | ConnectNKT";
  }, []);

  useEffect(() => {
    async function fetchSupporters() {
      setLoading(true);
      try {
        const response = await api.get(`/api/donation/supporters?page=${page}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch supporters:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSupporters();
  }, [page]);

  return (
    <div className="stack">
      <PageHeader
        title="Top Supporters"
        subtitle="All verified donors who have supported ConnectNKT."
        action={
          <Link to="/donate" className="btn btn-secondary flex items-center gap-2">
            <FiArrowLeft /> Back to Donate
          </Link>
        }
      />

      <SectionCard>
        {loading ? (
          <SkeletonCard />
        ) : data.supporters.length ? (
          <div className="space-y-3">
            {data.supporters.map((supporter, index) => (
              <div
                key={supporter.donor_name || index}
                className="flex items-center gap-4 p-4 bg-[var(--bg-solid)] rounded-xl border border-[var(--line)] hover:border-blue-200 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {((data.page - 1) * 50) + index + 1}
                </div>
                <UserAvatar name={supporter.donor_name} size={48} />
                <div className="flex-1">
                  <div className="font-semibold">{supporter.donor_name}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Total Donation: <span className="font-bold text-blue-500">₹{Number(supporter.total_amount).toLocaleString()}</span>
                  </div>
                  {supporter.last_donation_date && (
                    <div className="text-xs text-[var(--text-secondary)]">
                      Last donation: {formatDate(supporter.last_donation_date)}
                    </div>
                  )}
                </div>
                {index === 0 && data.page === 1 && (
                  <div className="flex-shrink-0">
                    <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                      Top Supporter
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No supporters yet" message="Be the first to support ConnectNKT!" />
        )}

        {!loading && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--line)]">
            <button
              className="btn btn-secondary flex items-center gap-2"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <FiArrowLeft /> Previous
            </button>
            <div className="text-sm text-[var(--text-secondary)]">
              Page {page} of {data.totalPages}
            </div>
            <button
              className="btn btn-secondary flex items-center gap-2"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <FiArrowLeft className="rotate-180" />
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
