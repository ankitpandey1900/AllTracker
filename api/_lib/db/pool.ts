import { Pool } from "pg";
import { assertDatabaseConfigured } from "../config/env.js";

declare global {
  // eslint-disable-next-line no-var
  var __allTrackerPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (globalThis.__allTrackerPgPool) {
    return globalThis.__allTrackerPgPool;
  }

  const databaseUrl = assertDatabaseConfigured();
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: databaseUrl.includes("sslmode=")
      ? undefined
      : { rejectUnauthorized: false },
  });

  globalThis.__allTrackerPgPool = pool;
  return pool;
}
