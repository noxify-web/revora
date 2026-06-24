import { and, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { importedReviews, reviewImports } from "@/src/db/schema";

export async function refreshImportPublishCounts(
  shop: string,
  importId: string
) {
  const [importRecord, reviews] = await Promise.all([
    db.query.reviewImports.findFirst({
      where: and(eq(reviewImports.id, importId), eq(reviewImports.shop, shop)),
    }),
    db.query.importedReviews.findMany({
      where: and(
        eq(importedReviews.importId, importId),
        eq(importedReviews.shop, shop)
      ),
    }),
  ]);

  if (!importRecord) {
    return null;
  }

  const totalPublished = reviews.filter(
    (review) => review.syncStatus === "published"
  ).length;
  const totalImported = Math.max(
    importRecord.totalImported ?? 0,
    reviews.length
  );
  const now = new Date().toISOString();

  let publishStatus = importRecord.publishStatus;
  if (totalPublished === 0) {
    publishStatus = "draft";
  } else if (totalPublished >= totalImported) {
    publishStatus = "published";
  } else {
    publishStatus = "partial";
  }

  await db
    .update(reviewImports)
    .set({
      totalImported,
      totalPublished,
      publishStatus,
      publishedAt: totalPublished > 0 ? now : null,
      updatedAt: now,
    })
    .where(eq(reviewImports.id, importId));

  return { totalImported, totalPublished, publishStatus };
}
