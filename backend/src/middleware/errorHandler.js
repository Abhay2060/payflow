const errorHandler = (err, req, res, next) => {
  // Postgres unique violation error code
  if (err.code === "23505") {
    return res.status(409).json({ error: "A record with that value already exists" });
  }

  // Postgres foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record does not exist" });
  }

  // Postgres check constraint violation (e.g. amount > 0, valid status)
  if (err.code === "23514") {
    return res.status(422).json({ error: "Value violates a database constraint" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV === "development") {
    console.error(`[${req.method}] ${req.path} → ${status}: ${message}`);
    if (err.stack) console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
