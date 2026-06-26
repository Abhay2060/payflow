const paymentService = require("../services/paymentService");

const createIntent = async (req, res, next) => {
  try {
    const { amount, currency, idempotencyKey, metadata } = req.body;
    const merchantId = req.merchant.id;

    const errors = [];
    if (amount === undefined || amount === null) errors.push("amount is required");
    else if (!Number.isInteger(amount))           errors.push("amount must be an integer (paise/cents — no decimals)");
    else if (amount <= 0)                         errors.push("amount must be greater than 0");
    if (!currency)                                errors.push("currency is required");
    else if (!/^[A-Z]{3}$/.test(currency))        errors.push("currency must be 3 uppercase letters (e.g. INR, USD)");
    if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim())
                                                  errors.push("idempotencyKey is required");

    if (errors.length > 0) return res.status(422).json({ error: errors.join(", ") });

    const result = await paymentService.createIntent({
      merchantId, amount, currency, idempotencyKey: idempotencyKey.trim(), metadata,
    });

    const { fromCache, ...responseData } = result;
    res.status(fromCache ? 200 : 201).json(responseData);
  } catch (error) {
    next(error);
  }
};

const confirmIntent = async (req, res, next) => {
  try {
    const result = await paymentService.confirmIntent({
      intentId: req.params.id,
      merchantId: req.merchant.id,
      paymentMethodId: req.body.paymentMethodId || "pm_mock_default",
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const cancelIntent = async (req, res, next) => {
  try {
    const intent = await paymentService.cancelIntent({
      intentId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ intent });
  } catch (error) {
    next(error);
  }
};

const listIntents = async (req, res, next) => {
  try {
    const { status, from_date, to_date, page, limit } = req.query;
    const result = await paymentService.listIntents({
      merchantId: req.merchant.id,
      status, fromDate: from_date, toDate: to_date, page, limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getIntent = async (req, res, next) => {
  try {
    const intent = await paymentService.getIntent({
      intentId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ intent });
  } catch (error) {
    next(error);
  }
};

module.exports = { createIntent, confirmIntent, cancelIntent, listIntents, getIntent };
