const { pool } = require("../config/db");
const processorService = require("./processorService");

// ── createRefund ──────────────────────────────────────────────────────────────
const createRefund = async ({ transactionId, merchantId, amount, reason }) => {
  // 1. Find transaction — must belong to this merchant
  const txnResult = await pool.query(
    `SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2`,
    [transactionId, merchantId]
  );

  if (txnResult.rows.length === 0) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }

  const transaction = txnResult.rows[0];

  // 2. Only succeeded transactions can be refunded
  if (transaction.status !== "succeeded") {
    const err = new Error(`Cannot refund a transaction with status '${transaction.status}'`);
    err.status = 409;
    throw err;
  }

  // 3. Calculate how much has already been refunded
  //    SUM of all succeeded refunds for this transaction
  const refundedResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_refunded
     FROM refunds
     WHERE transaction_id = $1 AND status = 'succeeded'`,
    [transactionId]
  );

  const alreadyRefunded = parseInt(refundedResult.rows[0].total_refunded);
  const available = transaction.amount - alreadyRefunded;

  if (amount > available) {
    const err = new Error(
      `Refund amount ${amount} exceeds available balance ${available}`
    );
    err.status = 422;
    throw err;
  }

  // 4. Create refund record with status 'pending'
  const refundResult = await pool.query(
    `INSERT INTO refunds (transaction_id, merchant_id, amount, reason, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [transactionId, merchantId, amount, reason]
  );

  const refund = refundResult.rows[0];

  // 5. Log event — refund initiated
  await pool.query(
    `INSERT INTO transaction_events
       (transaction_id, event_type, from_status, to_status, payload)
     VALUES ($1, 'refund_initiated', NULL, 'pending', $2)`,
    [transactionId, JSON.stringify({ refundId: refund.id, amount, reason })]
  );

  // 6. Call mock processor
  const processorResult = await processorService.refund(
    amount,
    transaction.currency,
    transaction.gateway_ref
  );

  const finalStatus = processorResult.success ? "succeeded" : "failed";

  // 7. Update refund record with final status
  const updatedRefund = await pool.query(
    `UPDATE refunds
     SET status         = $1,
         gateway_ref    = $2,
         gateway_response = $3,
         failure_code   = $4,
         failure_message = $5,
         updated_at     = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      finalStatus,
      processorResult.success ? processorResult.gatewayRef : null,
      JSON.stringify(processorResult.raw),
      processorResult.success ? null : processorResult.failureCode,
      processorResult.success ? null : processorResult.failureMessage,
      refund.id,
    ]
  );

  // 8. Log event — refund completed
  await pool.query(
    `INSERT INTO transaction_events
       (transaction_id, event_type, from_status, to_status, payload)
     VALUES ($1, 'refund_completed', 'pending', $2, $3)`,
    [
      transactionId,
      finalStatus,
      JSON.stringify({
        refundId: refund.id,
        amount,
        gatewayRef: processorResult.success ? processorResult.gatewayRef : null,
        failureCode: processorResult.success ? null : processorResult.failureCode,
      }),
    ]
  );

  return formatRefund(updatedRefund.rows[0]);
};

// ── listRefunds ───────────────────────────────────────────────────────────────
const listRefunds = async ({ transactionId, merchantId }) => {
  // Verify the transaction belongs to this merchant first
  const txnCheck = await pool.query(
    `SELECT id FROM transactions WHERE id = $1 AND merchant_id = $2`,
    [transactionId, merchantId]
  );

  if (txnCheck.rows.length === 0) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }

  const result = await pool.query(
    `SELECT * FROM refunds WHERE transaction_id = $1 ORDER BY created_at ASC`,
    [transactionId]
  );

  return result.rows.map(formatRefund);
};

// ── getTransactionWithEvents ──────────────────────────────────────────────────
const getTransactionWithEvents = async ({ transactionId, merchantId }) => {
  // Verify ownership
  const txnResult = await pool.query(
    `SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2`,
    [transactionId, merchantId]
  );

  if (txnResult.rows.length === 0) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }

  const transaction = txnResult.rows[0];

  // Fetch all refunds
  const refundsResult = await pool.query(
    `SELECT * FROM refunds WHERE transaction_id = $1 ORDER BY created_at ASC`,
    [transactionId]
  );

  // Fetch all events — sorted ASC so you see the full timeline
  const eventsResult = await pool.query(
    `SELECT * FROM transaction_events WHERE transaction_id = $1 ORDER BY created_at ASC`,
    [transactionId]
  );

  return {
    ...formatTransaction(transaction),
    refunds: refundsResult.rows.map(formatRefund),
    events: eventsResult.rows.map(formatEvent),
  };
};

// ── getEvents ─────────────────────────────────────────────────────────────────
const getEvents = async ({ transactionId, merchantId }) => {
  const txnCheck = await pool.query(
    `SELECT id FROM transactions WHERE id = $1 AND merchant_id = $2`,
    [transactionId, merchantId]
  );

  if (txnCheck.rows.length === 0) {
    const err = new Error("Transaction not found");
    err.status = 404;
    throw err;
  }

  const result = await pool.query(
    `SELECT * FROM transaction_events WHERE transaction_id = $1 ORDER BY created_at ASC`,
    [transactionId]
  );

  return result.rows.map(formatEvent);
};

// ── Formatters ────────────────────────────────────────────────────────────────
const formatTransaction = (row) => ({
  id:              row.id,
  paymentIntentId: row.payment_intent_id,
  merchantId:      row.merchant_id,
  amount:          row.amount,
  currency:        row.currency,
  status:          row.status,
  gatewayRef:      row.gateway_ref,
  failureCode:     row.failure_code,
  failureMessage:  row.failure_message,
  createdAt:       row.created_at,
  updatedAt:       row.updated_at,
});

const formatRefund = (row) => ({
  id:             row.id,
  transactionId:  row.transaction_id,
  merchantId:     row.merchant_id,
  amount:         row.amount,
  reason:         row.reason,
  status:         row.status,
  gatewayRef:     row.gateway_ref,
  failureCode:    row.failure_code,
  failureMessage: row.failure_message,
  createdAt:      row.created_at,
  updatedAt:      row.updated_at,
});

const formatEvent = (row) => ({
  id:            row.id,
  transactionId: row.transaction_id,
  eventType:     row.event_type,
  fromStatus:    row.from_status,
  toStatus:      row.to_status,
  payload:       row.payload,
  createdAt:     row.created_at,
});

module.exports = { createRefund, listRefunds, getTransactionWithEvents, getEvents };
