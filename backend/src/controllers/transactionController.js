const refundService = require("../services/refundService");

// POST /transactions/:id/refund
const createRefund = async (req, res, next) => {
  try {
    const { id: transactionId } = req.params;
    const { amount, reason } = req.body;
    const merchantId = req.merchant.id;

    const errors = [];

    if (amount === undefined || amount === null) {
      errors.push("amount is required");
    } else if (!Number.isInteger(amount)) {
      errors.push("amount must be an integer (paise/cents — no decimals)");
    } else if (amount <= 0) {
      errors.push("amount must be greater than 0");
    }

    const validReasons = ["requested_by_customer", "duplicate", "fraudulent"];
    if (!reason) {
      errors.push("reason is required");
    } else if (!validReasons.includes(reason)) {
      errors.push(`reason must be one of: ${validReasons.join(", ")}`);
    }

    if (errors.length > 0) {
      return res.status(422).json({ error: errors.join(", ") });
    }

    const refund = await refundService.createRefund({
      transactionId,
      merchantId,
      amount,
      reason,
    });

    res.status(201).json({ refund });
  } catch (error) {
    next(error);
  }
};

// GET /transactions/:id/refunds
const listRefunds = async (req, res, next) => {
  try {
    const refunds = await refundService.listRefunds({
      transactionId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ refunds });
  } catch (error) {
    next(error);
  }
};

// GET /transactions/:id — full detail with refunds + events
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await refundService.getTransactionWithEvents({
      transactionId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ transaction });
  } catch (error) {
    next(error);
  }
};

// GET /transactions/:id/events — audit log timeline
const getEvents = async (req, res, next) => {
  try {
    const events = await refundService.getEvents({
      transactionId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRefund, listRefunds, getTransaction, getEvents };
