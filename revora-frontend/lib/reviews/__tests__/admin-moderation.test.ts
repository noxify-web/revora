import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { importedReviews, reviewImports } from "@/src/db/schema";

import { createTestDatabase } from "./test-db";

describe("updateReviewModeration", () => {
  beforeEach(async () => {
    vi.resetModules();
    const db = await createTestDatabase();
    const shop = "demo.myshopify.com";
    const importId = "import-1";
    const now = "2024-06-01T00:00:00.000Z";

    await db.insert(reviewImports).values({
      id: importId,
      shop,
      temuGoodsId: "goods-1",
      status: "completed",
      publishStatus: "draft",
      totalImported: 1,
      totalPublished: 0,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(importedReviews).values({
      id: "review-1",
      shop,
      importId,
      temuReviewId: "temu-1",
      temuGoodsId: "goods-1",
      comment: "Pending review",
      score: 5,
      authorName: "Alice",
      shopifyProductId: "gid://shopify/Product/1",
      source: "storefront",
      syncStatus: "pending",
      createdAt: now,
    });
  });

  it("approves a review and refreshes import publish counts", async () => {
    const shop = "demo.myshopify.com";
    const { updateReviewModeration } = await import("@/lib/reviews/admin");
    const result = await updateReviewModeration(shop, "review-1", "approve");

    expect(result.status).toBe("published");

    const { db } = await import("@/src/db");
    const importRecord = await db.query.reviewImports.findFirst({
      where: eq(reviewImports.id, "import-1"),
    });

    expect(importRecord?.totalPublished).toBe(1);
    expect(importRecord?.publishStatus).toBe("published");
  });
});
