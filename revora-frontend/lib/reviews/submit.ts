import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  enforceRateLimit,
  getRequestClientKey,
} from "@/lib/extension/rate-limit";
import { refreshImportPublishCounts } from "@/lib/reviews/import-counts";
import { getShopAutoPublish } from "@/lib/reviews/settings";
import { shopifyProductIdVariants } from "@/lib/reviews/storefront";
import { db } from "@/src/db";
import { importedReviews, reviewImports } from "@/src/db/schema";

const submitReviewSchema = z.object({
  shop: z.string().min(1),
  productId: z.string().min(1),
  authorName: z.string().trim().min(1).max(80),
  authorEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value ?? ""),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
});

const STOREFRONT_IMPORT_PREFIX = "storefront";

async function getOrCreateStorefrontImport(
  shop: string,
  shopifyProductId: string
) {
  const existing = await db.query.reviewImports.findFirst({
    where: and(
      eq(reviewImports.shop, shop),
      eq(
        reviewImports.temuGoodsId,
        `${STOREFRONT_IMPORT_PREFIX}:${shopifyProductId}`
      )
    ),
  });

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const importRecord = {
    id: randomUUID(),
    shop,
    temuGoodsId: `${STOREFRONT_IMPORT_PREFIX}:${shopifyProductId}`,
    temuProductUrl: null,
    temuProductTitle: null,
    shopifyProductId,
    shopifyProductTitle: null,
    status: "completed",
    publishStatus: "draft",
    totalExpected: null,
    totalCollected: 0,
    totalImported: 0,
    totalPublished: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    publishedAt: null,
  };

  await db.insert(reviewImports).values(importRecord);
  return importRecord;
}

export async function submitStorefrontReview(request: Request, body: unknown) {
  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review data");
  }

  if (
    parsed.data.authorEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.authorEmail)
  ) {
    throw new Error("Invalid email address");
  }

  const shop = parsed.data.shop.trim().toLowerCase();
  const productIds = shopifyProductIdVariants(parsed.data.productId);
  const shopifyProductId = productIds[0];
  const rateKey = getRequestClientKey(request, `storefront-review:${shop}`);
  await enforceRateLimit(rateKey, 5);

  const autoPublish = await getShopAutoPublish(shop);
  const importRecord = await getOrCreateStorefrontImport(
    shop,
    shopifyProductId
  );
  const now = new Date().toISOString();
  const reviewId = randomUUID();
  const syncStatus = autoPublish ? "published" : "pending";

  await db.insert(importedReviews).values({
    id: reviewId,
    shop,
    importId: importRecord.id,
    temuReviewId: `storefront-${reviewId}`,
    temuGoodsId: importRecord.temuGoodsId,
    comment: parsed.data.comment,
    translatedComment: null,
    score: parsed.data.score,
    authorName: parsed.data.authorName,
    authorEmail: parsed.data.authorEmail || null,
    reviewTime: Math.floor(Date.now() / 1000),
    pictures: null,
    shopifyProductId,
    source: "storefront",
    helpfulCount: 0,
    notHelpfulCount: 0,
    syncStatus,
    publishedAt: autoPublish ? now : null,
    createdAt: now,
  });

  await refreshImportPublishCounts(shop, importRecord.id);

  return {
    success: true,
    published: autoPublish,
    message: autoPublish
      ? "Thank you! Your review is now live."
      : "Thank you! Your review was submitted and is pending approval.",
  };
}
