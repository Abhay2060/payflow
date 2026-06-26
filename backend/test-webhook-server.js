// ── Test Webhook Receiver ─────────────────────────────────────────────────────
// Run this in a SEPARATE terminal: node test-webhook-server.js
//
// Set your merchant's webhookUrl to: http://localhost:3001/webhook
// via: PATCH /merchants/me  { "webhookUrl": "http://localhost:3001/webhook" }
//
// Then confirm a payment intent and watch this server log the delivery.
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-gateway-signature"];
  const event     = req.headers["x-gateway-event"];
  const payload   = req.body;

  console.log("\n─────────────────────────────────────");
  console.log(`Event:     ${event}`);
  console.log(`Signature: ${signature}`);
  console.log(`Payload:   ${JSON.stringify(payload, null, 2)}`);
  console.log("─────────────────────────────────────\n");

  // Respond 200 so the worker marks delivery as succeeded
  res.status(200).json({ received: true });
});

app.listen(3001, () => {
  console.log("Test webhook receiver running on http://localhost:3001");
  console.log("Set your webhookUrl to: http://localhost:3001/webhook");
});
