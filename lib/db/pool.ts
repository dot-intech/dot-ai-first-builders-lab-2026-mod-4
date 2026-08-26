import { Pool } from "pg";

declare global {
  var __nutrashotDbPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }
  return new Pool({ connectionString });
}

export const pool = global.__nutrashotDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__nutrashotDbPool = pool;
}
