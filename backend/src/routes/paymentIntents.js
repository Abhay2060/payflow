const express = require("express");
const router = express.Router();
const { protectApiKey } = require("../middleware/auth");
const { createIntent, confirmIntent, cancelIntent, listIntents, getIntent } = require("../controllers/paymentController");

router.use(protectApiKey);

router.post("/",           createIntent);
router.get("/",            listIntents);
router.get("/:id",         getIntent);
router.post("/:id/confirm", confirmIntent);
router.post("/:id/cancel",  cancelIntent);

module.exports = router;
