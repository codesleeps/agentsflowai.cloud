import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// Example usage (server side only):
// const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
