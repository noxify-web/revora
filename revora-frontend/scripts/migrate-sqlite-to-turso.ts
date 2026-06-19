import { config } from "dotenv"
import { Database } from "bun:sqlite"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import {
  extensionTokens,
  importedReviews,
  reviewImports,
  sessions,
} from "../src/db/schema"

config({ path: ".env.local" })

const sqlite = new Database("prisma/dev.db")

const turso = drizzle(
  createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
)

async function migrateTable<T extends Record<string, unknown>>(
  name: string,
  rows: T[],
  insert: (row: T) => Promise<unknown>,
) {
  if (!rows.length) {
    console.log(`${name}: skipped (0 rows)`)
    return
  }

  for (const row of rows) {
    await insert(row)
  }

  console.log(`${name}: migrated ${rows.length} rows`)
}

async function main() {
  const sessionRows = sqlite
    .query("SELECT * FROM Session")
    .all() as (typeof sessions.$inferInsert)[]

  const tokenRows = sqlite
    .query("SELECT * FROM ExtensionToken")
    .all() as (typeof extensionTokens.$inferInsert)[]

  const importRows = sqlite
    .query("SELECT * FROM ReviewImport")
    .all() as (typeof reviewImports.$inferInsert)[]

  const reviewRows = sqlite
    .query("SELECT * FROM ImportedReview")
    .all() as (typeof importedReviews.$inferInsert)[]

  await migrateTable("Session", sessionRows, (row) =>
    turso.insert(sessions).values(row).onConflictDoNothing(),
  )

  await migrateTable("ExtensionToken", tokenRows, (row) =>
    turso.insert(extensionTokens).values(row).onConflictDoNothing(),
  )

  await migrateTable("ReviewImport", importRows, (row) =>
    turso.insert(reviewImports).values(row).onConflictDoNothing(),
  )

  await migrateTable("ImportedReview", reviewRows, (row) =>
    turso.insert(importedReviews).values(row).onConflictDoNothing(),
  )

  console.log("Migration complete")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})