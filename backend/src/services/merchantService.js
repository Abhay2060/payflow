const { pool } = require("../config/db");

// ── getMe ─────────────────────────────────────────────────────────────────────
const getMe = async (merchantId) => {
  const result = await pool.query(
    `SELECT id, name, email, webhook_url, status, created_at, updated_at
     FROM merchants
     WHERE id = $1`,
    [merchantId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Merchant not found");
    err.status = 404;
    throw err;
  }

  return result.rows[0];
};

// ── updateMe ──────────────────────────────────────────────────────────────────
const updateMe = async (merchantId, { name, webhookUrl }) => {
  const updates = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      const err = new Error("Name cannot be empty");
      err.status = 400;
      throw err;
    }
    updates.push(`name = $${idx++}`);
    values.push(name.trim());
  }

  if (webhookUrl !== undefined) {
    if (webhookUrl !== null && webhookUrl !== "") {
      try { new URL(webhookUrl); } catch {
        const err = new Error("webhookUrl must be a valid URL");
        err.status = 400;
        throw err;
      }
    }
    updates.push(`webhook_url = $${idx++}`);
    values.push(webhookUrl || null);
  }

  if (updates.length === 0) {
    const err = new Error("No valid fields to update");
    err.status = 400;
    throw err;
  }

  updates.push(`updated_at = NOW()`);
  values.push(merchantId);

  const result = await pool.query(
    `UPDATE merchants
     SET ${updates.join(", ")}
     WHERE id = $${idx}
     RETURNING id, name, email, webhook_url, status, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

const getStats = async (merchantId) => {
  // Total volume + count of succeeded payments
  const volumeResult = await pool.query(
    `SELECT
       COUNT(*)                                    AS total_payments,
       COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
       COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
       COUNT(*) FILTER (WHERE status = 'created')   AS active,
       COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) AS total_volume
     FROM payment_intents
     WHERE merchant_id = $1`,
    [merchantId]
  );

  // Last 7 days — succeeded payments per day
  const chartResult = await pool.query(
    `SELECT
       DATE(created_at) AS date,
       COUNT(*)         AS count,
       COALESCE(SUM(amount), 0) AS volume
     FROM payment_intents
     WHERE merchant_id = $1
       AND status = 'succeeded'
       AND created_at >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [merchantId]
  );

  // Recent 10 intents
  const recentResult = await pool.query(
    `SELECT id, amount, currency, status, created_at
     FROM payment_intents
     WHERE merchant_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [merchantId]
  );

  const stats = volumeResult.rows[0];

  return {
    totalPayments: parseInt(stats.total_payments),
    succeeded:     parseInt(stats.succeeded),
    failed:        parseInt(stats.failed),
    active:        parseInt(stats.active),
    totalVolume:   parseInt(stats.total_volume),
    successRate:   stats.total_payments > 0
      ? Math.round((stats.succeeded / stats.total_payments) * 100)
      : 0,
    chart:  chartResult.rows.map((r) => ({
      date:   r.date,
      count:  parseInt(r.count),
      volume: parseInt(r.volume),
    })),
    recent: recentResult.rows,
  };
};

module.exports = { getMe, updateMe, getStats };