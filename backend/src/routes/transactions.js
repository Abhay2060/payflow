const express = require("express");
const router = express.Router();
const { protectApiKey } = require("../middleware/auth");
const {
  createRefund,
  listRefunds,
  getTransaction,
  getEvents,
} = require("../controllers/transactionController");

// All transaction routes use API key auth — same as payment intents
router.use(protectApiKey);

// GET  /transactions/:id               — full transaction detail + refunds + events
// GET  /transactions/:id/refunds       — list all refunds for this transaction
// POST /transactions/:id/refund        — initiate a refund
// GET  /transactions/:id/events        — full audit log timeline
router.get("/:id",         getTransaction);
router.get("/:id/refunds", listRefunds);
router.post("/:id/refund", createRefund);
router.get("/:id/events",  getEvents);

module.exports = router;
