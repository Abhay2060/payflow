// ── StatusBadge ───────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const colors = {
    created:    "badge-info",
    processing: "badge-warning",
    succeeded:  "badge-success",
    failed:     "badge-error",
    cancelled:  "badge-ghost",
    delivered:  "badge-success",
    pending:    "badge-warning",
  };
  return (
    <span className={`badge badge-sm ${colors[status] || "badge-ghost"}`}>
      {status}
    </span>
  );
};

// ── CopyButton ────────────────────────────────────────────────────────────────
import { useState } from "react";

export const CopyButton = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copy} className="btn btn-xs btn-outline">
      {copied ? "Copied ✓" : label}
    </button>
  );
};

// ── PageHeader ────────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle }) => (
  <div className="mb-6">
    <h1 className="text-2xl font-bold">{title}</h1>
    {subtitle && <p className="text-base-content/60 mt-1">{subtitle}</p>}
  </div>
);

// ── StatCard ──────────────────────────────────────────────────────────────────
export const StatCard = ({ title, value, desc, icon }) => (
  <div className="stat bg-base-100 rounded-xl shadow">
    <div className="stat-figure text-primary text-3xl">{icon}</div>
    <div className="stat-title">{title}</div>
    <div className="stat-value text-primary">{value}</div>
    {desc && <div className="stat-desc">{desc}</div>}
  </div>
);

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-20">
    <span className="loading loading-spinner loading-lg text-primary" />
  </div>
);

// ── ErrorAlert ────────────────────────────────────────────────────────────────
export const ErrorAlert = ({ message }) => (
  <div className="alert alert-error">
    <span>{message}</span>
  </div>
);

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({ message = "No data found" }) => (
  <div className="text-center py-16 text-base-content/40">
    <div className="text-5xl mb-3">📭</div>
    <p>{message}</p>
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────
export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center mt-6 gap-2">
      <button
        className="btn btn-sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        «
      </button>
      <span className="btn btn-sm btn-disabled">
        {page} / {totalPages}
      </span>
      <button
        className="btn btn-sm"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        »
      </button>
    </div>
  );
};

// ── formatAmount ──────────────────────────────────────────────────────────────
export const formatAmount = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
};

// ── formatDate ────────────────────────────────────────────────────────────────
export const formatDate = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// ── truncate ──────────────────────────────────────────────────────────────────
export const truncate = (str, n = 12) =>
  str ? `${str.slice(0, n)}...` : "—";
