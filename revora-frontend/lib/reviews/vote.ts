import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  enforceRateLimit,
  getRequestClientKey,
} from "@/lib/extension/rate-limit";
import { db } from "@/src/db";
import { importedReviews } from "@/src/db/schema";

const voteSchema = z.object({
  shop: z.string().min(1),
  vote: z.enum(["helpful", "not_helpful"]),
});

export async function voteOnStorefrontReview(
  request: Request,
  reviewId: string,
  body: unknown
) {
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid vote data");
  }

  const shop = parsed.data.shop.trim().toLowerCase();
  const rateKey = getRequestClientKey(request, `storefront-vote:${shop}`);
  await enforceRateLimit(rateKey, 30);

  const review = await db.query.importedReviews.findFirst({
    where: and(
      eq(importedReviews.id, reviewId),
      eq(importedReviews.shop, shop),
      eq(importedReviews.syncStatus, "published")
    ),
  });

  if (!review) {
    throw new Error("Review not found");
  }

  const helpfulCount =
    (review.helpfulCount ?? 0) + (parsed.data.vote === "helpful" ? 1 : 0);
  const notHelpfulCount =
    (review.notHelpfulCount ?? 0) +
    (parsed.data.vote === "not_helpful" ? 1 : 0);

  await db
    .update(importedReviews)
    .set({ helpfulCount, notHelpfulCount })
    .where(eq(importedReviews.id, review.id));

  return {
    id: review.id,
    helpfulCount,
    notHelpfulCount,
  };
}
