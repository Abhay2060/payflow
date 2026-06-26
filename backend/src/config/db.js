const { Pool } = require("pg");

// Pool keeps multiple DB connections open and reuses them.
// We create ONE pool and export it — every service imports this same instance.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectDB = async () => {
  // query() sends a raw SQL string to Postgres and returns the result
  await pool.query("SELECT 1");
  console.log("PostgreSQL connected");
};

module.exports = { pool, connectDB };
