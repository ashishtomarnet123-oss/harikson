import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt"
});

// Log any pool errors to prevent crashes
pool.on("error", (err) => {
  console.error("⚠️ [Harikson DB Pool] Unexpected database connection error:", err);
});
