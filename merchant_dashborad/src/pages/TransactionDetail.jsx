import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { paymentAPI, transactionAPI } from "../api/client";
import {
  StatusBadge, LoadingSpinner, ErrorAlert,
  formatAmount, formatDate, truncate, CopyButton,
} from "../components/ui";

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intent, setIntent] = useState(null);
  const [txnDetail, setTxnDetail] = useState(null); // transaction + events + refunds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const intentRes = await paymentAPI.get(id);
        setIntent(intentRes.data.intent);

        // If there's a transaction, load its full detail + events
        if (intentRes.data.intent?.transactions?.length > 0) {
          const txnId = intentRes.data.intent.transactions[0].id;
          const txnRes = await transactionAPI.get(txnId);
          setTxnDetail(txnRes.data.transaction);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!intent) return <ErrorAlert message="Intent not found" />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-sm btn-ghost">← Back</button>
        <h1 className="text-xl font-bold">Payment Intent Detail</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Intent info */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-base">Intent</h2>
            <table className="table table-sm">
              <tbody>
                <tr><td className="text-base-content/60 w-32">ID</td>
                  <td className="flex gap-2 items-center font-mono text-xs">
                    {truncate(intent.id, 16)}
                    <CopyButton text={intent.id} />
                  </td>
                </tr>
                <tr><td className="text-base-content/60">Amount</td><td className="font-bold">{formatAmount(intent.amount, intent.currency)}</td></tr>
                <tr><td className="text-base-content/60">Currency</td><td>{intent.currency}</td></tr>
                <tr><td className="text-base-content/60">Status</td><td><StatusBadge status={intent.status} /></td></tr>
                <tr><td className="text-base-content/60">Created</td><td className="text-sm">{formatDate(intent.created_at)}</td></tr>
                <tr><td className="text-base-content/60">Expires</td><td className="text-sm">{formatDate(intent.expires_at)}</td></tr>
                {intent.metadata && (
                  <tr>
                    <td className="text-base-content/60">Metadata</td>
                    <td><pre className="text-xs bg-base-200 p-2 rounded overflow-auto">{JSON.stringify(intent.metadata, null, 2)}</pre></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction info */}
        {txnDetail && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">Transaction</h2>
              <table className="table table-sm">
                <tbody>
                  <tr><td className="text-base-content/60 w-32">ID</td>
                    <td className="font-mono text-xs">{truncate(txnDetail.id, 16)}</td>
                  </tr>
                  <tr><td className="text-base-content/60">Status</td><td><StatusBadge status={txnDetail.status} /></td></tr>
                  {txnDetail.gatewayRef && (
                    <tr><td className="text-base-content/60">Gateway Ref</td><td className="font-mono text-xs">{txnDetail.gatewayRef}</td></tr>
                  )}
                  {txnDetail.failureCode && (
                    <tr><td className="text-base-content/60">Failure</td>
                      <td><span className="text-error text-sm">{txnDetail.failureCode}: {txnDetail.failureMessage}</span></td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Refunds */}
              {txnDetail.refunds?.length > 0 && (
                <div className="mt-4">
                  <div className="font-medium text-sm mb-2">Refunds</div>
                  {txnDetail.refunds.map((r) => (
                    <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-base-200 text-sm">
                      <span>{formatAmount(r.amount, intent.currency)}</span>
                      <span className="text-base-content/60">{r.reason}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event timeline */}
      {txnDetail?.events?.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-base">Event Timeline</h2>
            <p className="text-sm text-base-content/60 mb-4">Every state change, append-only</p>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-base-300" />

              <div className="space-y-4">
                {txnDetail.events.map((event, i) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 text-xs font-bold shrink-0 ${
                      event.to_status === "succeeded" ? "bg-success text-success-content" :
                      event.to_status === "failed"    ? "bg-error text-error-content" :
                      event.event_type.includes("refund") ? "bg-warning text-warning-content" :
                      "bg-primary text-primary-content"
                    }`}>
                      {i + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-base-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-sm">{event.event_type}</span>
                          {event.from_status && event.to_status && (
                            <span className="text-xs text-base-content/60 ml-2">
                              {event.from_status} → {event.to_status}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-base-content/50">{formatDate(event.created_at)}</span>
                      </div>
                      {event.payload && Object.keys(event.payload).length > 0 && (
                        <pre className="text-xs mt-2 text-base-content/60 overflow-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetail;
