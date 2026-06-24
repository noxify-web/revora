import { and, desc, eq, inArray } from "drizzle-orm";

import {
  buildStorefrontReviewsPayload,
  type StorefrontQueryOptions,
} from "@/lib/reviews/storefront-core";
import { db } from "@/src/db";
import { importedReviews } from "@/src/db/schema";

export function shopifyProductIdVariants(productId: string) {
  const trimmed = productId.trim();

  if (trimmed.startsWith("gid://shopify/Product/")) {
    const numeric = trimmed.split("/").pop() ?? trimmed;
    return numeric === trimmed ? [trimmed] : [trimmed, numeric];
  }

  const gid = `gid://shopify/Product/${trimmed}`;
  return trimmed === gid ? [trimmed] : [trimmed, gid];
}

export async function getPublishedReviewsForProduct(
  shop: string,
  shopifyProductId: string,
  options?: StorefrontQueryOptions
) {
  const productIds = shopifyProductIdVariants(shopifyProductId);

  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.shop, shop),
      inArray(importedReviews.shopifyProductId, productIds),
      eq(importedReviews.syncStatus, "published")
    ),
    orderBy: [
      desc(importedReviews.publishedAt),
      desc(importedReviews.reviewTime),
    ],
  });

  return buildStorefrontReviewsPayload(reviews, options);
}
