import pool from "./db";

type SqlPrimitive = string | number | boolean | Date | null;
type SqlParam = SqlPrimitive | SqlPrimitive[] | Record<string, unknown>;

/**
 * Query the app's internal Postgres database directly
 * @param sql - The SQL query to execute, using $1, $2, etc. for parameters
 * @param params - The parameters to pass to the query
 * @returns The result rows from the query
 */
export async function queryInternalDatabase(sql: string, params: SqlParam[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  } finally {
    client.release();
  }
}
