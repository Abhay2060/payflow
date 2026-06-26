import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { paymentAPI } from "../api/client";
import {
  PageHeader, StatusBadge, LoadingSpinner, ErrorAlert,
  EmptyState, Pagination, formatAmount, formatDate, truncate,
} from "../components/ui";

const STATUS_OPTIONS = ["", "created", "processing", "succeeded", "failed", "cancelled"];

const Transactions = () => {
  const navigate = useNavigate();
  const [intents, setIntents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ status: "", from_date: "", to_date: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 15, ...filters };
      // Remove empty filters
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await paymentAPI.list(params);
      setIntents(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filters]);

  return (
    <div>
      <PageHeader title="Transactions" subtitle="All payment intents for your account" />

      {/* Filters */}
      <div className="card bg-base-100 shadow mb-4">
        <div className="card-body py-4">
          <div className="flex flex-wrap gap-3">
            <select
              className="select select-sm select-bordered"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || "All statuses"}</option>
              ))}
            </select>

            <input
              type="date"
              className="input input-sm input-bordered"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              placeholder="From date"
            />

            <input
              type="date"
              className="input input-sm input-bordered"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              placeholder="To date"
            />

            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setFilters({ status: "", from_date: "", to_date: "" })}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : intents.length === 0 ? (
        <EmptyState message="No transactions found" />
      ) : (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {intents.map((intent) => (
                <tr key={intent.id} className="hover cursor-pointer" onClick={() => navigate(`/intent/${intent.id}`)}>
                  <td className="font-mono text-xs">{truncate(intent.id, 8)}</td>
                  <td className="font-medium">{formatAmount(intent.amount, intent.currency)}</td>
                  <td>{intent.currency}</td>
                  <td><StatusBadge status={intent.status} /></td>
                  <td className="text-xs text-base-content/60">{formatDate(intent.created_at)}</td>
                  <td>
                    <button className="btn btn-xs btn-ghost">View →</button>
                  </td>
                </tr>
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

export default Transactions;
