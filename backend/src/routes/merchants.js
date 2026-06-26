const express = require("express");
const router = express.Router();
const { protectJWT } = require("../middleware/auth");
const { getMe, updateMe, rotateApiKey } = require("../controllers/merchantController");
const { getStats } = require("../services/merchantService");
const { pool } = require("../config/db");

router.use(protectJWT);
router.get("/me", getMe);

router.get("/me/stats", async (req, res, next) => {
  try {
    const stats = await getStats(req.merchant.id);
    res.status(200).json({ stats });
  } catch (error) {
    next(error);
  }
});

// JWT-protected paginated list of payment intents for dashboard
router.get("/me/payment-intents", async (req, res, next) => {
  try {
    const merchantId = req.merchant.id;
    const { status, from_date, to_date, page = 1, limit = 15 } = req.query;

    const conditions = ["merchant_id = $1"];
    const values = [merchantId];
    let idx = 2;

    if (status) { conditions.push(`status = $${idx++}`); values.push(status); }
    if (from_date) { conditions.push(`created_at >= $${idx++}`); values.push(new Date(from_date)); }
    if (to_date) { conditions.push(`created_at <= $${idx++}`); values.push(new Date(to_date)); }

    const where = conditions.join(" AND ");
    const safeLimit = Math.min(parseInt(limit), 100);
    const safePage = Math.max(parseInt(page), 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payment_intents WHERE ${where}`, values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT * FROM payment_intents WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, safeLimit, offset]
    );

    res.status(200).json({
      data: dataResult.rows,
      pagination: {
        total, page: safePage, limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// JWT-protected single payment intent
router.get("/me/payment-intents/:id", async (req, res, next) => {
  try {
    const intentResult = await pool.query(
      `SELECT * FROM payment_intents WHERE id = $1 AND merchant_id = $2`,
      [req.params.id, req.merchant.id]
    );
    if (intentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment intent not found" });
    }
    const txnResult = await pool.query(
      `SELECT * FROM transactions WHERE payment_intent_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.status(200).json({
      intent: { ...intentResult.rows[0], transactions: txnResult.rows },
    });
  } catch (error) {
    next(error);
  }
});

// JWT-protected transaction detail with events + refunds
router.get("/me/transactions/:id", async (req, res, next) => {
  try {
    const txnResult = await pool.query(
      `SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2`,
      [req.params.id, req.merchant.id]
    );
    if (txnResult.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const eventsResult = await pool.query(
      `SELECT * FROM transaction_events WHERE transaction_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    const refundsResult = await pool.query(
      `SELECT * FROM refunds WHERE transaction_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.status(200).json({
      transaction: {
        ...txnResult.rows[0],
        events: eventsResult.rows,
        refunds: refundsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// JWT-protected webhook deliveries
router.get("/me/webhooks", async (req, res, next) => {
  try {
    const { status, page = 1, limit = 15 } = req.query;
    const conditions = ["merchant_id = $1"];
    const values = [req.merchant.id];
    let idx = 2;

    if (status) { conditions.push(`status = $${idx++}`); values.push(status); }

    const where = conditions.join(" AND ");
    const safeLimit = Math.min(parseInt(limit), 100);
    const safePage = Math.max(parseInt(page), 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM webhook_deliveries WHERE ${where}`, values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT * FROM webhook_deliveries WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, safeLimit, offset]
    );

    res.status(200).json({
      data: dataResult.rows,
      pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", updateMe);
router.post("/me/rotate-key", rotateApiKey);

module.exports = router;
