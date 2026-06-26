const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool } = require("../config/db");

// ── register ──────────────────────────────────────────────────────────────────
const register = async ({ name, email, password }) => {
  // Check duplicate email
  const existing = await pool.query(
    "SELECT id FROM merchants WHERE email = $1",
    [email.toLowerCase()]
  );

  if (existing.rows.length > 0) {
    const err = new Error("Email already registered");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const rawApiKey = crypto.randomBytes(32).toString("hex");
  const apiKeyHash = await bcrypt.hash(rawApiKey, 10);

  const result = await pool.query(
    `INSERT INTO merchants (name, email, password, api_key_hash, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, name, email, status, created_at`,
    [name, email.toLowerCase(), passwordHash, apiKeyHash]
  );

  return {
    merchant: result.rows[0],
    apiKey: rawApiKey,
  };
};

// ── login ─────────────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const result = await pool.query(
    "SELECT * FROM merchants WHERE email = $1",
    [email.toLowerCase()]
  );

  const merchant = result.rows[0];

  if (!merchant) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, merchant.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  if (merchant.status === "suspended") {
    const err = new Error("Account suspended");
    err.status = 403;
    throw err;
  }

  const token = jwt.sign(
    { merchantId: merchant.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      status: merchant.status,
    },
  };
};

// ── rotateApiKey ──────────────────────────────────────────────────────────────
const rotateApiKey = async (merchantId) => {
  const rawApiKey = crypto.randomBytes(32).toString("hex");
  const apiKeyHash = await bcrypt.hash(rawApiKey, 10);

  const result = await pool.query(
    `UPDATE merchants
     SET api_key_hash = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id`,
    [apiKeyHash, merchantId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Merchant not found");
    err.status = 404;
    throw err;
  }

  return { apiKey: rawApiKey };
};

module.exports = { register, login, rotateApiKey };
