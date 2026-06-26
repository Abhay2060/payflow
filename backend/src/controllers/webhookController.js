const webhookService = require("../services/webhookService");

// GET /webhooks
const listDeliveries = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await webhookService.listDeliveries({
      merchantId: req.merchant.id,
      status, page, limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /webhooks/:id
const getDelivery = async (req, res, next) => {
  try {
    const delivery = await webhookService.getDelivery({
      deliveryId: req.params.id,
      merchantId: req.merchant.id,
    });
    res.status(200).json({ delivery });
  } catch (error) {
    next(error);
  }
};

module.exports = { listDeliveries, getDelivery };
