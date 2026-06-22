import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

function createDatabase() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url) {
    throw new Error(
      "Missing TURSO_DATABASE_URL. Add your Turso database URL to .env.local."
    );
  }

  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

const globalForDb = globalThis as typeof globalThis & {
  __revoraDb?: ReturnType<typeof createDatabase>;
};

export const db = globalForDb.__revoraDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__revoraDb = db;
}
