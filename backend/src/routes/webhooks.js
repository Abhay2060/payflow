const express = require("express");
const router = express.Router();
const { protectJWT } = require("../middleware/auth");
const { listDeliveries, getDelivery } = require("../controllers/webhookController");

// JWT auth — merchants view their webhook delivery history from the dashboard
router.use(protectJWT);

router.get("/",    listDeliveries);
router.get("/:id", getDelivery);

module.exports = router;
