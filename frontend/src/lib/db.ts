import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Make database optional - returns null if not configured
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  const sql = neon(url);
  return drizzle(sql);
}

export const db = createDb();
