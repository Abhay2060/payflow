const { pool } = require("../config/db");
const { redis } = require("../config/redis");
const processorService = require("./processorService");
const { webhookQueue } = require("../utils/webhookQueue");

const idempotencyRedisKey = (merchantId, key) =>
  `idempotency:${merchantId}:${key}`;

// ── createIntent ──────────────────────────────────────────────────────────────
const createIntent = async ({ merchantId, amount, currency, idempotencyKey: iKey, metadata }) => {
  const cached = await redis.get(idempotencyRedisKey(merchantId, iKey));
  if (cached) {
    return { ...JSON.parse(cached), fromCache: true };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO payment_intents
       (merchant_id, amount, currency, status, idempotency_key, metadata, expires_at)
     VALUES ($1, $2, $3, 'created', $4, $5, $6)
     RETURNING *`,
    [merchantId, amount, currency.toUpperCase(), iKey, metadata ? JSON.stringify(metadata) : null, expiresAt]
  );

  const intent = result.rows[0];
  const response = formatIntent(intent);

  await redis.setex(idempotencyRedisKey(merchantId, iKey), 86400, JSON.stringify(response));

  return response;
};

// ── confirmIntent ─────────────────────────────────────────────────────────────
const confirmIntent = async ({ intentId, merchantId, paymentMethodId }) => {
  const found = await pool.query(
    `SELECT * FROM payment_intents WHERE id = $1 AND merchant_id = $2`,
    [intentId, merchantId]
  );

  if (found.rows.length === 0) {
    const err = new Error("Payment intent not found");
    err.status = 404;
    throw err;
  }

  const intent = found.rows[0];

  const stateErrors = {
    processing: "Payment is already being processed",
    succeeded:  "Payment has already succeeded",
    failed:     "Payment has already failed — create a new intent to retry",
    cancelled:  "Payment intent has been cancelled",
  };

  if (stateErrors[intent.status]) {
    const err = new Error(stateErrors[intent.status]);
    err.status = 409;
    throw err;
  }

  if (new Date() > new Date(intent.expires_at)) {
    const err = new Error("Payment intent has expired");
    err.status = 409;
    throw err;
  }

  // Lock against duplicate confirms
  await pool.query(
    `UPDATE payment_intents SET status = 'processing', updated_at = NOW() WHERE id = $1`,
    [intentId]
  );

  const processorResult = await processorService.charge(
    intent.amount,
    intent.currency,
    paymentMethodId
  );

  const finalStatus = processorResult.success ? "succeeded" : "failed";

  // Create transaction record
  const txnResult = await pool.query(
    `INSERT INTO transactions
       (payment_intent_id, merchant_id, amount, currency, status,
        gateway_ref, gateway_response, failure_code, failure_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      intentId,
      merchantId,
      intent.amount,
      intent.currency,
      finalStatus,
      processorResult.success ? processorResult.gatewayRef : null,
      JSON.stringify(processorResult.raw),
      processorResult.success ? null : processorResult.failureCode,
      processorResult.success ? null : processorResult.failureMessage,
    ]
  );

  const transaction = txnResult.rows[0];

  // Update intent to final status
  const updatedIntent = await pool.query(
    `UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [finalStatus, intentId]
  );

  // Audit log — record this status change
  await pool.query(
    `INSERT INTO transaction_events
       (transaction_id, event_type, from_status, to_status, payload)
     VALUES ($1, 'status_change', 'pending', $2, $3)`,
    [
      transaction.id,
      finalStatus,
      JSON.stringify({
        gatewayRef: processorResult.success ? processorResult.gatewayRef : null,
        failureCode: processorResult.success ? null : processorResult.failureCode,
      }),
    ]
  );

  // Fetch merchant webhook URL to decide whether to enqueue
  const merchantResult = await pool.query(
    `SELECT webhook_url FROM merchants WHERE id = $1`,
    [merchantId]
  );

  const webhookUrl = merchantResult.rows[0]?.webhook_url;

  // Only enqueue if merchant has set a webhook URL
  if (webhookUrl) {
    const eventType = finalStatus === "succeeded" ? "payment.succeeded" : "payment.failed";

    await webhookQueue.add("deliver", {
      merchantId,
      paymentIntentId: intentId,
      eventType,
      webhookUrl,
      data: {
        id:         intentId,
        amount:     intent.amount,
        currency:   intent.currency,
        status:     finalStatus,
        gatewayRef: processorResult.success ? processorResult.gatewayRef : null,
        failureCode: processorResult.success ? null : processorResult.failureCode,
        transaction: {
          id:     transaction.id,
          status: finalStatus,
        },
      },
    });
  }

  return {
    intent: formatIntent(updatedIntent.rows[0]),
    transaction: formatTransaction(transaction),
  };
};

// ── cancelIntent ──────────────────────────────────────────────────────────────
const cancelIntent = async ({ intentId, merchantId }) => {
  const found = await pool.query(
    `SELECT * FROM payment_intents WHERE id = $1 AND merchant_id = $2`,
    [intentId, merchantId]
  );

  if (found.rows.length === 0) {
    const err = new Error("Payment intent not found");
    err.status = 404;
    throw err;
  }

  const intent = found.rows[0];

  if (intent.status !== "created") {
    const err = new Error(`Cannot cancel a payment intent with status '${intent.status}'`);
    err.status = 409;
    throw err;
  }

  const result = await pool.query(
    `UPDATE payment_intents SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [intentId]
  );

  await redis.del(idempotencyRedisKey(merchantId, intent.idempotency_key));

  return formatIntent(result.rows[0]);
};

// ── listIntents ───────────────────────────────────────────────────────────────
const listIntents = async ({ merchantId, status, fromDate, toDate, page = 1, limit = 20 }) => {
  const conditions = ["merchant_id = $1"];
  const values = [merchantId];
  let idx = 2;

  if (status) {
    const valid = ["created", "processing", "succeeded", "failed", "cancelled"];
    if (!valid.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${valid.join(", ")}`);
      err.status = 400;
      throw err;
    }
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  if (fromDate) { conditions.push(`created_at >= $${idx++}`); values.push(new Date(fromDate)); }
  if (toDate)   { conditions.push(`created_at <= $${idx++}`); values.push(new Date(toDate)); }

  const where = conditions.join(" AND ");
  const safeLimit = Math.min(parseInt(limit), 100);
  const safePage  = Math.max(parseInt(page), 1);
  const offset    = (safePage - 1) * safeLimit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM payment_intents WHERE ${where}`, values
  );

  const total = parseInt(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM payment_intents WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, safeLimit, offset]
  );

  return {
    data: dataResult.rows.map(formatIntent),
    pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
  };
};

// ── getIntent ─────────────────────────────────────────────────────────────────
const getIntent = async ({ intentId, merchantId }) => {
  const intentResult = await pool.query(
    `SELECT * FROM payment_intents WHERE id = $1 AND merchant_id = $2`,
    [intentId, merchantId]
  );

  if (intentResult.rows.length === 0) {
    const err = new Error("Payment intent not found");
    err.status = 404;
    throw err;
  }

  const txnResult = await pool.query(
    `SELECT * FROM transactions WHERE payment_intent_id = $1 ORDER BY created_at ASC`,
    [intentId]
  );

  return {
    ...formatIntent(intentResult.rows[0]),
    transactions: txnResult.rows.map(formatTransaction),
  };
};

// ── Formatters ────────────────────────────────────────────────────────────────
const formatIntent = (row) => ({
  id:             row.id,
  merchantId:     row.merchant_id,
  amount:         row.amount,
  currency:       row.currency,
  status:         row.status,
  idempotencyKey: row.idempotency_key,
  metadata:       row.metadata,
  expiresAt:      row.expires_at,
  createdAt:      row.created_at,
  updatedAt:      row.updated_at,
});

const formatTransaction = (row) => ({
  id:              row.id,
  paymentIntentId: row.payment_intent_id,
  amount:          row.amount,
  currency:        row.currency,
  status:          row.status,
  gatewayRef:      row.gateway_ref,
  failureCode:     row.failure_code,
  failureMessage:  row.failure_message,
  createdAt:       row.created_at,
});

module.exports = { createIntent, confirmIntent, cancelIntent, listIntents, getIntent };
