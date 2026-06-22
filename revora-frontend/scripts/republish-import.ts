import { publishImportToStorefront } from "@/lib/reviews/publish";
import { getShopify, sessionStorage } from "@/lib/shopify/shopify";

const shop = process.argv[2] || "noxify-dvgwvtrt.myshopify.com";
const importId = process.argv[3];

if (!importId) {
  console.error("Usage: bun scripts/republish-import.ts <shop> <import-id>");
  process.exit(1);
}

const shopify = getShopify();
const offlineId = shopify.session.getOfflineId(shop);
const session = await sessionStorage.loadSession(offlineId);

if (!session?.accessToken) {
  console.error(
    `No offline session for ${shop}. Open Revora in Shopify admin first.`
  );
  process.exit(1);
}

const result = await publishImportToStorefront(session, importId);
console.log(JSON.stringify(result, null, 2));
