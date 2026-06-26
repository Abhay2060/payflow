import { useState, useEffect } from "react";
import { webhookAPI } from "../api/client";
import {
  PageHeader, StatusBadge, LoadingSpinner, ErrorAlert,
  EmptyState, Pagination, formatDate, truncate,
} from "../components/ui";

const Webhooks = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 15 };
      if (filter) params.status = filter;
      const res = await webhookAPI.list(params);
      setDeliveries(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filter]);

  return (
    <div>
      <PageHeader title="Webhook Deliveries" subtitle="Outgoing notifications to your server" />

      <div className="flex gap-3 mb-4">
        {["", "delivered", "failed", "pending"].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(s)}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : deliveries.length === 0 ? (
        <EmptyState message="No webhook deliveries yet. Complete a payment to see deliveries here." />
      ) : (
        <div className="card bg-base-100 shadow">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Event</th>
                <th>URL</th>
                <th>Status</th>
                <th>Response</th>
                <th>Attempt</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <>
                  <tr key={d.id} className="hover cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                    <td>
                      <span className="badge badge-outline badge-sm">{d.eventType}</span>
                    </td>
                    <td className="font-mono text-xs">{truncate(d.url, 30)}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      {d.responseStatus ? (
                        <span className={`badge badge-sm ${d.responseStatus < 300 ? "badge-success" : "badge-error"}`}>
                          {d.responseStatus}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-center">{d.attemptNumber}</td>
                    <td className="text-xs text-base-content/60">{formatDate(d.created_at)}</td>
                    <td>{expanded === d.id ? "▲" : "▼"}</td>
                  </tr>

                  {expanded === d.id && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={7} className="bg-base-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium mb-1 text-base-content/60">Request Payload</div>
                            <pre className="text-xs bg-base-100 p-3 rounded overflow-auto max-h-48">
                              {JSON.stringify(d.requestPayload, null, 2)}
                            </pre>
                          </div>
                          {d.responseBody && (
                            <div>
                              <div className="text-xs font-medium mb-1 text-base-content/60">Response Body</div>
                              <pre className="text-xs bg-base-100 p-3 rounded overflow-auto max-h-48">
                                {d.responseBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          <div className="p-4">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => load(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
