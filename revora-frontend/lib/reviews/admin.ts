import { and, count, desc, eq, inArray } from "drizzle-orm";

import { refreshImportPublishCounts } from "@/lib/reviews/import-counts";
import { db } from "@/src/db";
import { importedReviews } from "@/src/db/schema";

export type AdminReviewStatus = "pending" | "published" | "rejected" | "all";

export interface AdminReviewListItem {
  authorEmail: string | null;
  authorName: string | null;
  comment: string | null;
  createdAt: string;
  helpfulCount: number;
  id: string;
  importId: string;
  notHelpfulCount: number;
  productId: string | null;
  publishedAt: string | null;
  score: number | null;
  source: string;
  status: string;
}

function productIdVariants(productId: string) {
  if (productId.startsWith("gid://")) {
    const numeric = productId.split("/").pop();
    return numeric ? [productId, numeric] : [productId];
  }

  return [productId, `gid://shopify/Product/${productId}`];
}

function mapAdminReview(
  review: typeof importedReviews.$inferSelect
): AdminReviewListItem {
  return {
    id: review.id,
    importId: review.importId,
    authorName: review.authorName,
    authorEmail: review.authorEmail,
    comment: review.translatedComment || review.comment,
    score: review.score,
    source: review.source ?? "temu",
    status: review.syncStatus,
    productId: review.shopifyProductId,
    helpfulCount: review.helpfulCount ?? 0,
    notHelpfulCount: review.notHelpfulCount ?? 0,
    createdAt: review.createdAt,
    publishedAt: review.publishedAt,
  };
}

function buildListConditions(
  shop: string,
  options?: {
    status?: AdminReviewStatus;
    productId?: string;
  }
) {
  const conditions = [eq(importedReviews.shop, shop)];

  if (options?.status && options.status !== "all") {
    conditions.push(eq(importedReviews.syncStatus, options.status));
  }

  if (options?.productId) {
    conditions.push(
      inArray(
        importedReviews.shopifyProductId,
        productIdVariants(options.productId)
      )
    );
  }

  return and(...conditions);
}

export async function countAdminReviewsByStatus(
  shop: string,
  status: Exclude<AdminReviewStatus, "all">
) {
  const [row] = await db
    .select({ value: count() })
    .from(importedReviews)
    .where(
      and(
        eq(importedReviews.shop, shop),
        eq(importedReviews.syncStatus, status)
      )
    );

  return row?.value ?? 0;
}

export async function listAdminReviews(
  shop: string,
  options?: {
    status?: AdminReviewStatus;
    productId?: string;
    limit?: number;
  }
) {
  const limit = Math.min(200, options?.limit ?? 100);

  const reviews = await db.query.importedReviews.findMany({
    where: buildListConditions(shop, options),
    orderBy: [desc(importedReviews.createdAt)],
    limit,
  });

  return reviews.map(mapAdminReview);
}

export async function updateReviewModeration(
  shop: string,
  reviewId: string,
  action: "approve" | "unpublish" | "reject"
) {
  const review = await db.query.importedReviews.findFirst({
    where: and(
      eq(importedReviews.id, reviewId),
      eq(importedReviews.shop, shop)
    ),
  });

  if (!review) {
    throw new Error("Review not found");
  }

  const now = new Date().toISOString();
  let syncStatus = review.syncStatus;
  let publishedAt = review.publishedAt;

  switch (action) {
    case "approve":
      syncStatus = "published";
      publishedAt = now;
      break;
    case "unpublish":
      syncStatus = "pending";
      publishedAt = null;
      break;
    case "reject":
      syncStatus = "rejected";
      publishedAt = null;
      break;
    default:
      break;
  }

  await db
    .update(importedReviews)
    .set({ syncStatus, publishedAt })
    .where(eq(importedReviews.id, review.id));

  await refreshImportPublishCounts(shop, review.importId);

  return {
    id: review.id,
    status: syncStatus,
    publishedAt,
  };
}

export async function bulkUpdateReviewModeration(
  shop: string,
  reviewIds: string[],
  action: "approve" | "unpublish" | "reject"
) {
  const results: Awaited<ReturnType<typeof updateReviewModeration>>[] = [];
  const errors: string[] = [];

  for (const reviewId of reviewIds) {
    try {
      results.push(await updateReviewModeration(shop, reviewId, action));
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `Failed to update ${reviewId}`
      );
    }
  }

  if (errors.length && !results.length) {
    throw new Error(errors[0]);
  }

  return { results, errors };
}
