import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export async function ensurePriceColumnScale(): Promise<void> {
  const client = await pool.connect();
  try {
    const alterStatements = [
      "ALTER TABLE assets ALTER COLUMN quantity TYPE DECIMAL(18,8)",
      "ALTER TABLE assets ALTER COLUMN average_price TYPE DECIMAL(18,8)",
      "ALTER TABLE assets ALTER COLUMN current_price TYPE DECIMAL(18,8)",
      "ALTER TABLE transactions ALTER COLUMN quantity TYPE DECIMAL(18,8)",
      "ALTER TABLE transactions ALTER COLUMN price TYPE DECIMAL(18,8)",
      "ALTER TABLE transactions ALTER COLUMN total_amount TYPE DECIMAL(18,8)",
    ];
    for (const sql of alterStatements) {
      await client.query(sql);
    }
    console.log("[db] Price columns verified at DECIMAL(18,8) precision");
  } catch (err) {
    console.warn("[db] Column scale migration skipped (tables may not exist yet):", (err as Error).message);
  } finally {
    client.release();
  }
}
