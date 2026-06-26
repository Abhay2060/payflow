const { pool } = require("../config/db");

// ── listDeliveries ────────────────────────────────────────────────────────────
const listDeliveries = async ({ merchantId, status, page = 1, limit = 20 }) => {
  const conditions = ["merchant_id = $1"];
  const values = [merchantId];
  let idx = 2;

  if (status) {
    const valid = ["pending", "delivered", "failed"];
    if (!valid.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${valid.join(", ")}`);
      err.status = 400;
      throw err;
    }
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  const where = conditions.join(" AND ");
  const safeLimit = Math.min(parseInt(limit), 100);
  const safePage  = Math.max(parseInt(page), 1);
  const offset    = (safePage - 1) * safeLimit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM webhook_deliveries WHERE ${where}`, values
  );

  const total = parseInt(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM webhook_deliveries
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, safeLimit, offset]
  );

  return {
    data: dataResult.rows.map(formatDelivery),
    pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
  };
};

// ── getDelivery ───────────────────────────────────────────────────────────────
const getDelivery = async ({ deliveryId, merchantId }) => {
  const result = await pool.query(
    `SELECT * FROM webhook_deliveries WHERE id = $1 AND merchant_id = $2`,
    [deliveryId, merchantId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Webhook delivery not found");
    err.status = 404;
    throw err;
  }

  return formatDelivery(result.rows[0]);
};

// ── Formatter ─────────────────────────────────────────────────────────────────
const formatDelivery = (row) => ({
  id:              row.id,
  merchantId:      row.merchant_id,
  paymentIntentId: row.payment_intent_id,
  eventType:       row.event_type,
  url:             row.url,
  requestPayload:  row.request_payload,
  responseStatus:  row.response_status,
  responseBody:    row.response_body,
  attemptNumber:   row.attempt_number,
  status:          row.status,
  deliveredAt:     row.delivered_at,
  createdAt:       row.created_at,
});

module.exports = { listDeliveries, getDelivery };
