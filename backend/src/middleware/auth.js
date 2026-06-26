const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

// ── JWT gatekeeper ────────────────────────────────────────────────────────────
const protectJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
      return res.status(401).json({ error: message });
    }

    const result = await pool.query(
      `SELECT id, name, email, webhook_url, status FROM merchants WHERE id = $1`,
      [decoded.merchantId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Merchant not found" });
    }

    const merchant = result.rows[0];

    if (merchant.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    next(error);
  }
};

// ── API key gatekeeper ────────────────────────────────────────────────────────
const protectApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const merchantId = req.headers["x-merchant-id"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No API key provided" });
    }

    if (!merchantId) {
      return res.status(401).json({ error: "X-Merchant-ID header is required" });
    }

    const providedKey = authHeader.split(" ")[1];

    const result = await pool.query(
      `SELECT * FROM merchants WHERE id = $1`,
      [merchantId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const merchant = result.rows[0];

    if (merchant.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    const isValid = await bcrypt.compare(providedKey, merchant.api_key_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protectJWT, protectApiKey };
