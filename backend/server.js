require("dotenv").config();

const express = require("express");
const { connectDB } = require("./src/config/db");
const { connectRedis } = require("./src/config/redis");
const errorHandler = require("./src/middleware/errorHandler");
const cors = require("cors");

const authRoutes         = require("./src/routes/auth");
const merchantRoutes     = require("./src/routes/merchants");
const paymentIntentRoutes = require("./src/routes/paymentIntents");
const transactionRoutes   = require("./src/routes/transactions");
const webhookRoutes       = require("./src/routes/webhooks");

const app = express();

app.use(cors({origin: process.env.CORS_ORIGIN , credentials: true})); // Adjust CORS settings as needed
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth",            authRoutes);
app.use("/merchants",       merchantRoutes);
app.use("/payment-intents", paymentIntentRoutes);
app.use("/transactions",    transactionRoutes);
app.use("/webhooks",        webhookRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();
