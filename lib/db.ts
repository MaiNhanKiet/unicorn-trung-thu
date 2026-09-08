import "server-only";
import postgres from "postgres";

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Thiếu DATABASE_URL trong .env");
  }
  return url;
}

const globalForDb = globalThis as typeof globalThis & {
  __trungthuSql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.__trungthuSql ??
  postgres(requireDatabaseUrl(), {
    // Transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__trungthuSql = sql;
}
