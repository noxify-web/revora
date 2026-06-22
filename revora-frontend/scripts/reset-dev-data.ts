/**
 * Wipe Revora app data from Turso for a fresh onboarding / install experience.
 *
 * Usage (from revora-frontend/):
 *   bun run db:reset              # app data only (keeps Shopify OAuth sessions)
 *   bun run db:reset -- --full    # also deletes Session rows (re-auth / reinstall feel)
 */

import { config } from "dotenv";
import { sql } from "drizzle-orm";

import { db } from "@/src/db";

config({ path: ".env.local" });

const fullReset = process.argv.includes("--full");

const tables = [
  "ImportedReview",
  "ReviewImport",
  "ExtensionToken",
  "ShopPlan",
  "ConnectCode",
  "RateLimit",
  ...(fullReset ? ["Session"] : []),
] as const;

async function countTable(table: string) {
  const result = await db.get<{ count: number }>(
    sql.raw(`SELECT COUNT(*) AS count FROM "${table}"`)
  );
  return result?.count ?? 0;
}

async function main() {
  console.log(
    fullReset ? "Full reset (including Shopify sessions)" : "App data reset"
  );

  for (const table of tables) {
    const before = await countTable(table);
    await db.run(sql.raw(`DELETE FROM "${table}"`));
    const after = await countTable(table);
    console.log(`  ${table}: deleted ${before} row(s), ${after} remaining`);
  }

  console.log("");
  console.log("Turso database cleared.");
  console.log("");
  console.log("Browser (Revora admin in Shopify):");
  console.log("  Open the app with ?reset=1, or run in DevTools console:");
  console.log(
    '  ["revora-onboarding-dismissed","revora-onboarding-extension-install-ack","revora-onboarding-flow-complete","revora-onboarding-flow-step","revora-setup-guide-dismissed","revora-auto-import"].forEach(k=>localStorage.removeItem(k))'
  );
  console.log("");
  console.log("Chrome extension:");
  console.log("  chrome://extensions → Revora → Details → Clear storage");
  console.log(
    "  Or open the popup → disconnect, then connect again after reset."
  );
  if (!fullReset) {
    console.log("");
    console.log("Sessions were kept. For a full reinstall feel, run:");
    console.log("  bun run db:reset -- --full");
    console.log(
      "  Then reopen Revora in Shopify admin (may prompt OAuth again)."
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
