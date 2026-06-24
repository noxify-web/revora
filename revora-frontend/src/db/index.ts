import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

type RevoraDatabase = ReturnType<typeof createTursoDatabase>;

function createTursoDatabase() {
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
  __revoraDb?: RevoraDatabase;
};

function getDatabase() {
  if (process.env.VITEST === "true" && globalForDb.__revoraDb) {
    return globalForDb.__revoraDb;
  }

  if (globalForDb.__revoraDb) {
    return globalForDb.__revoraDb;
  }

  const database = createTursoDatabase();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__revoraDb = database;
  }

  return database;
}

export const db = new Proxy({} as RevoraDatabase, {
  get(_target, property, receiver) {
    const database = getDatabase();
    const value = Reflect.get(database, property, receiver);

    if (typeof value === "function") {
      return value.bind(database);
    }

    return value;
  },
});
