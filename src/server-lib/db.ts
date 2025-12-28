import pg from 'pg';
const { Pool } = pg;
import { getEnv } from "@/lib/env-validation";

const env = getEnv();

// Create a single pool instance to be reused across the application
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
});

export default pool;
