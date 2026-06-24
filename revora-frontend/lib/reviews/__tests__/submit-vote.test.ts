import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { importedReviews } from "@/src/db/schema";

import { createTestDatabase } from "./test-db";

function mockRequest(ip = "203.0.113.10") {
  return new Request("https://example.test/reviews", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("submitStorefrontReview", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a pending storefront review when auto-publish is off", async () => {
    await createTestDatabase();
    const shop = "demo.myshopify.com";
    const { submitStorefrontReview } = await import("@/lib/reviews/submit");

    const result = await submitStorefrontReview(mockRequest(), {
      shop,
      productId: "gid://shopify/Product/99",
      authorName: "Sam",
      score: 5,
      comment: "Love it",
    });

    expect(result.published).toBe(false);

    const { db } = await import("@/src/db");
    const review = await db.query.importedReviews.findFirst({
      where: eq(importedReviews.shop, shop),
    });

    expect(review?.syncStatus).toBe("pending");
    expect(review?.source).toBe("storefront");
  });
});

describe("voteOnStorefrontReview", () => {
  beforeEach(async () => {
    vi.resetModules();
    const db = await createTestDatabase();
    const shop = "demo.myshopify.com";
    const now = "2024-06-01T00:00:00.000Z";

    await db.insert(importedReviews).values({
      id: "review-vote-1",
      shop,
      importId: "import-1",
      temuReviewId: "temu-vote-1",
      temuGoodsId: "goods-1",
      comment: "Published",
      score: 5,
      authorName: "Pat",
      shopifyProductId: "gid://shopify/Product/1",
      source: "temu",
      syncStatus: "published",
      helpfulCount: 1,
      notHelpfulCount: 0,
      publishedAt: now,
      createdAt: now,
    });
  });

  it("increments helpful votes for published reviews", async () => {
    const shop = "demo.myshopify.com";
    const { voteOnStorefrontReview } = await import("@/lib/reviews/vote");
    const result = await voteOnStorefrontReview(
      mockRequest("203.0.113.11"),
      "review-vote-1",
      { shop, vote: "helpful" }
    );

    expect(result.helpfulCount).toBe(2);
    expect(result.notHelpfulCount).toBe(0);
  });
});
