const merchantService = require("../services/merchantService");
const authService = require("../services/authService");

const getMe = async (req, res, next) => {
  try {
    const merchant = await merchantService.getMe(req.merchant.id);
    res.status(200).json({ merchant });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { name, webhookUrl } = req.body;
    const merchant = await merchantService.updateMe(req.merchant.id, { name, webhookUrl });
    res.status(200).json({ merchant });
  } catch (error) {
    next(error);
  }
};

const rotateApiKey = async (req, res, next) => {
  try {
    const result = await authService.rotateApiKey(req.merchant.id);
    res.status(200).json({
      message: "API key rotated. Save your new key — it will not be shown again.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const { getStats } = require("../services/merchantService");
    const stats = await getStats(req.merchant.id);
    res.status(200).json({ stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMe, updateMe, rotateApiKey, getStats };
