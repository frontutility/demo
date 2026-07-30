import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiCheck, FiDownload, FiSearch, FiX } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import EmptyState from "../../components/ui/EmptyState";
import { useApiResource } from "../../api/useApiResource";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";
import { asArray, buildCsv, downloadCsv, normalizeBlueTickRequest } from "../utils/adminData";

const TABS = ["pending", "approved", "rejected", "revoked"];

export default function AdminBlueTicksPage() {
  const { showToast } = useOutletContext();
  const [activeTab, setActiveTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [actionId, setActionId] = useState(null);
  const { data: requestsData = [], loading, refetch } = useApiResource("/api/admin/blue-ticks", { initialData: [] });

  useEffect(() => {
    document.title = "ConnectNKT Admin | Blue Ticks";
  }, []);

  const requests = useMemo(() => asArray(requestsData).map(normalizeBlueTickRequest), [requestsData]);
  const filteredRequests = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return requests
      .filter((request) => !activeTab || request.requestStatus === activeTab)
      .filter((request) =>
        [request.id, request.user?.name, request.user?.username, request.requestReason, request.requestStatus]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(lowered)
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeTab, query, requests]);

  const csvRows = useMemo(
    () =>
      buildCsv(filteredRequests, [
        { label: "Request ID", value: "id" },
        { label: "User", value: (row) => row.user?.name || "" },
        { label: "Username", value: (row) => row.user?.username || "" },
        { label: "Followers", value: "followersCount" },
        { label: "Status", value: "requestStatus" },
        { label: "Created", value: "createdAt" },
      ]),
    [filteredRequests]
  );

  async function handleAction(requestId, action, successMessage) {
    setActionId(`${requestId}-${action}`);
    try {
      await api.put(`/api/blue-tick/requests/${requestId}/${action}`);
      showToast?.({ type: "success", title: "Updated", message: successMessage });
      refetch();
    } catch (error) {
      showToast?.({ type: "error", title: "Action failed", message: error?.response?.data?.message || error.message || "Unable to update request." });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="stack responsive-admin-page">
      <style>{`
        .responsive-admin-page .admin-toolbar {
          gap: clamp(8px, 2vw, 16px) !important;
          flex-wrap: wrap !important;
        }
        .responsive-admin-page .admin-toolbar > div:first-child {
          flex: 1 1 clamp(200px, 100%, 400px) !important;
        }
        .responsive-admin-page .admin-toolbar > div:last-child {
          flex: 1 1 clamp(150px, 100%, 400px) !important;
          gap: clamp(6px, 1.5vw, 12px) !important;
        }
        .responsive-admin-page .btn {
          font-size: clamp(11px, 1.5vw, 13px) !important;
          padding: clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 14px) !important;
        }
        .responsive-admin-page [style*="display: flex"] [style*="flex: 1"] {
          min-width: clamp(150px, 100%, 300px) !important;
        }
        @media (max-width: 768px) {
          .responsive-admin-page .admin-toolbar {
            flex-direction: column !important;
          }
          .responsive-admin-page .admin-toolbar > div {
            flex: 1 1 100% !important;
          }
          .responsive-admin-page .btn {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
        @media (max-width: 640px) {
          .responsive-admin-page .btn {
            padding: 4px 8px !important;
            font-size: 10px !important;
          }
          .responsive-admin-page img {
            width: 48px !important;
            height: 48px !important;
          }
        }
        @media (max-width: 480px) {
          .responsive-admin-page [style*="display: flex"][style*="gap: 14"] {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .responsive-admin-page img {
            width: 40px !important;
            height: 40px !important;
          }
          .responsive-admin-page .btn {
            padding: 4px 8px !important;
            font-size: 9px !important;
            min-width: auto !important;
          }
        }
      `}</style>
      <PageHeader title="Blue Tick Requests" subtitle="Approve, reject, and revoke user verification requests from the database." />

      <SectionCard
        title="Verification Queue"
        action={
          <button type="button" className="btn btn-secondary" onClick={() => downloadCsv("connectnkt-blue-ticks.csv", csvRows)} disabled={!filteredRequests.length}>
            <FiDownload /> Export CSV
          </button>
        }
      >
        <div className="admin-toolbar" style={{ marginBottom: 16 }}>
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests, users, or status..." style={{ paddingLeft: 40 }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TABS.map((tab) => (
              <button key={tab} type="button" className={`btn ${activeTab === tab ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : filteredRequests.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredRequests.map((request) => (
              <div key={request.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, border: "1px solid var(--line)", borderRadius: 16, background: "color-mix(in srgb, var(--bg-solid) 92%, transparent)" }}>
                <img
                  src={request.user?.profileImageUrl || "https://placehold.co/112x112?text=User"}
                  alt={request.user?.name || "User"}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flex: "none" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong>{request.user?.name || "Unknown"}</strong>
                    <span className="muted">@{request.user?.username || "unknown"}</span>
                    <span className="admin-badge">{request.requestStatus}</span>
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {request.followersCount} followers • {request.createdAt ? formatDate(request.createdAt) : "N/A"}
                  </div>
                  <p style={{ margin: "10px 0 0", lineHeight: 1.6 }}>{request.requestReason || "No request reason provided."}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {request.requestStatus === "pending" ? (
                    <>
                      <button className="btn btn-secondary" type="button" disabled={actionId === `${request.id}-approve`} onClick={() => handleAction(request.id, "approve", "Request approved successfully.")}>
                        <FiCheck /> Approve
                      </button>
                      <button className="btn btn-secondary" type="button" disabled={actionId === `${request.id}-reject`} onClick={() => handleAction(request.id, "reject", "Request rejected successfully.")}>
                        <FiX /> Reject
                      </button>
                    </>
                  ) : request.requestStatus === "approved" ? (
                    <button className="btn btn-secondary" type="button" disabled={actionId === `${request.id}-revoke`} onClick={() => handleAction(request.id, "revoke", "Verification revoked successfully.")}>
                      <FiX /> Revoke
                    </button>
                  ) : request.requestStatus === "rejected" || request.requestStatus === "revoked" ? (
                    <button className="btn btn-secondary" type="button" disabled={actionId === `${request.id}-approve`} onClick={() => handleAction(request.id, "approve", "Request approved successfully.")}>
                      <FiCheck /> Approve Again
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No blue tick requests" message="Try another filter or search term." />
        )}
      </SectionCard>
    </div>
  );
}
