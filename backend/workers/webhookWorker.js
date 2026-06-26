require("dotenv").config();

const { Worker } = require("bullmq");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Redis connection ───────────────────────────────────────────────────────────
const getConnection = () => {
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,   // required by BullMQ
    enableReadyCheck: false,      // required by BullMQ
    retryStrategy(times) {
      return Math.min(times * 500, 5000);
    },
  };
};

// ── HMAC signing ──────────────────────────────────────────────────────────────
const signPayload = (payload) => {
  const secret = process.env.WEBHOOK_SECRET || process.env.JWT_SECRET;
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
};

// ── Worker ────────────────────────────────────────────────────────────────────
const worker = new Worker(
  "webhooks",
  async (job) => {
    const { merchantId, paymentIntentId, eventType, webhookUrl, data } = job.data;

    const payload = {
      event: eventType,
      createdAt: new Date().toISOString(),
      data,
    };

    const signature = signPayload(payload);

    // Insert delivery record as pending before attempting
    const deliveryResult = await pool.query(
      `INSERT INTO webhook_deliveries
         (merchant_id, payment_intent_id, event_type, url, request_payload, attempt_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [
        merchantId,
        paymentIntentId,
        eventType,
        webhookUrl,
        JSON.stringify(payload),
        job.attemptsMade + 1,
      ]
    );

    const deliveryId = deliveryResult.rows[0].id;

    let responseStatus = null;
    let responseBody = null;
    let deliveryStatus = "failed";

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Signature": signature,
          "X-Gateway-Event": eventType,
        },
        timeout: 10000,
      });

      responseStatus = response.status;
      responseBody = typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);

      if (response.status >= 200 && response.status < 300) {
        deliveryStatus = "delivered";
      }

      console.log(`[webhook] ${eventType} → ${webhookUrl} → ${response.status}`);
    } catch (err) {
      if (err.response) {
        responseStatus = err.response.status;
        responseBody = typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
        console.error(`[webhook] ${eventType} → ${webhookUrl} → ${responseStatus} (failed)`);
      } else {
        responseBody = err.message;
        console.error(`[webhook] ${eventType} → ${webhookUrl} → network error: ${err.message}`);
      }

      await pool.query(
        `UPDATE webhook_deliveries
         SET status = 'failed', response_status = $1, response_body = $2, updated_at = NOW()
         WHERE id = $3`,
        [responseStatus, responseBody, deliveryId]
      );

      throw err; // BullMQ will retry
    }

    await pool.query(
      `UPDATE webhook_deliveries
       SET status = $1,
           response_status = $2,
           response_body = $3,
           delivered_at = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        deliveryStatus,
        responseStatus,
        responseBody,
        deliveryStatus === "delivered" ? new Date() : null,
        deliveryId,
      ]
    );
  },
  {
    connection: getConnection(),
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[webhook] Job ${job.id} completed — ${job.data.eventType}`);
});

worker.on("failed", (job, err) => {
  console.error(`[webhook] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
});

worker.on("error", (err) => {
  console.error(`[webhook] Worker error: ${err.message}`);
});

console.log("Webhook worker started — listening for jobs...");