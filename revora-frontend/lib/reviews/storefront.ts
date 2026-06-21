import { and, desc, eq, inArray } from "drizzle-orm"

import { parseStoredPictures } from "@/lib/extension/pictures"
import { db } from "@/src/db"
import { importedReviews } from "@/src/db/schema"

const DEFAULT_REVIEW_LIMIT = 30
const MAX_REVIEW_LIMIT = 30

export function shopifyProductIdVariants(productId: string) {
  const trimmed = productId.trim()

  if (trimmed.startsWith("gid://shopify/Product/")) {
    const numeric = trimmed.split("/").pop() ?? trimmed
    return numeric === trimmed ? [trimmed] : [trimmed, numeric]
  }

  const gid = `gid://shopify/Product/${trimmed}`
  return trimmed === gid ? [trimmed] : [trimmed, gid]
}

function reviewComment(review: {
  comment: string | null
  translatedComment: string | null
}) {
  return (review.translatedComment || review.comment || "").trim()
}

function formatReviewDate(reviewTime: number | null) {
  return reviewTime
    ? new Date(reviewTime * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
}

function clampScore(score: number | null) {
  return Math.min(5, Math.max(1, score ?? 5))
}

export async function getPublishedReviewsForProduct(
  shop: string,
  shopifyProductId: string,
  options?: { limit?: number },
) {
  const limit = Math.min(
    MAX_REVIEW_LIMIT,
    options?.limit ?? DEFAULT_REVIEW_LIMIT,
  )
  const productIds = shopifyProductIdVariants(shopifyProductId)

  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.shop, shop),
      inArray(importedReviews.shopifyProductId, productIds),
      eq(importedReviews.syncStatus, "published"),
    ),
    orderBy: [desc(importedReviews.publishedAt), desc(importedReviews.reviewTime)],
  })

  const scores = reviews
    .map((review) => review.score)
    .filter((score): score is number => typeof score === "number")

  const averageRating = scores.length
    ? Number(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1),
      )
    : 0

  return {
    count: reviews.length,
    averageRating,
    reviews: reviews.slice(0, limit).map((review) => ({
      authorName: review.authorName || "Customer",
      comment: reviewComment(review) || "Great product!",
      score: clampScore(review.score),
      reviewDate: formatReviewDate(review.reviewTime),
      pictures: parseStoredPictures(review.pictures),
    })),
  }
}