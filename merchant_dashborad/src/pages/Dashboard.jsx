import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { statsAPI } from "../api/client";
import { StatCard, LoadingSpinner, ErrorAlert, formatAmount } from "../components/ui";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const { merchant } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await statsAPI.get();
        setStats(res.data.stats);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  // Fill missing days in chart with 0
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const chartData = last7.map((date) => {
    const found = stats.chart.find(
      (c) => new Date(c.date).toISOString().slice(0, 10) === date
    );
    return {
      date: date.slice(5),
      payments: found ? found.count : 0,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {merchant?.name} 👋</h1>
        <p className="text-base-content/60 text-sm mt-1">Here's what's happening</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Volume"
          value={formatAmount(stats.totalVolume)}
          desc="All succeeded payments"
          icon="💰"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          desc={`${stats.succeeded} of ${stats.totalPayments} payments`}
          icon="✅"
        />
        <StatCard
          title="Active Intents"
          value={stats.active}
          desc="Awaiting confirmation"
          icon="⏳"
        />
      </div>

      {/* Chart */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-base">Successful Payments — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="payments"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      {stats.recent?.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-base">Recent Payments</h2>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.id.slice(0, 8)}...</td>
                    <td>{formatAmount(r.amount, r.currency)}</td>
                    <td>
                      <span className={`badge badge-sm ${
                        r.status === "succeeded" ? "badge-success" :
                        r.status === "failed"    ? "badge-error" :
                        r.status === "created"   ? "badge-info" : "badge-ghost"
                      }`}>{r.status}</span>
                    </td>
                    <td className="text-xs text-base-content/60">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
