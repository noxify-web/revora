import type { Session } from "@shopify/shopify-api";
import { and, eq } from "drizzle-orm";

import { refreshImportPublishCounts } from "@/lib/reviews/import-counts";
import { db } from "@/src/db";
import { importedReviews, reviewImports } from "@/src/db/schema";

export async function publishImportToStorefront(
  session: Session,
  importId: string
) {
  const importRecord = await db.query.reviewImports.findFirst({
    where: and(
      eq(reviewImports.id, importId),
      eq(reviewImports.shop, session.shop)
    ),
  });

  if (!importRecord) {
    throw new Error("Import not found");
  }

  if (!importRecord.shopifyProductId) {
    throw new Error("Import is missing a Shopify product mapping");
  }

  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.importId, importId),
      eq(importedReviews.shop, session.shop)
    ),
  });

  const pendingReviews = reviews.filter(
    (review) => review.syncStatus === "pending"
  );

  if (!pendingReviews.length) {
    throw new Error("No pending reviews to publish");
  }

  const now = new Date().toISOString();

  for (const review of pendingReviews) {
    await db
      .update(importedReviews)
      .set({
        syncStatus: "published",
        syncError: null,
        publishedAt: now,
        shopifyProductId: importRecord.shopifyProductId,
      })
      .where(eq(importedReviews.id, review.id));
  }

  await refreshImportPublishCounts(session.shop, importId);

  return {
    importId,
    published: pendingReviews.length,
    failed: 0,
    productId: importRecord.shopifyProductId,
    errors: [] as string[],
  };
}
