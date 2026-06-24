import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDatabase, seedPublishedReviews } from "./test-db";

describe("getPublishedReviewsForProduct", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns published reviews, aggregates, and respects sort/filter options", async () => {
    const shop = "demo.myshopify.com";
    const productId = "gid://shopify/Product/123";
    const db = await createTestDatabase();
    await seedPublishedReviews(db, shop, productId);

    const { getPublishedReviewsForProduct } = await import(
      "@/lib/reviews/storefront"
    );

    const payload = await getPublishedReviewsForProduct(shop, productId, {
      sort: "helpful",
      photosOnly: true,
      limit: 10,
    });

    expect(payload.count).toBe(2);
    expect(payload.averageRating).toBe(4.5);
    expect(payload.reviews).toHaveLength(1);
    expect(payload.reviews[0]?.id).toBe("pub-2");
    expect(payload.reviews[0]?.helpfulCount).toBe(8);
  });

  it("resolves numeric and gid product id variants", async () => {
    const shop = "demo.myshopify.com";
    const gid = "gid://shopify/Product/456";
    const db = await createTestDatabase();
    await seedPublishedReviews(db, shop, gid);

    const { getPublishedReviewsForProduct } = await import(
      "@/lib/reviews/storefront"
    );

    const payload = await getPublishedReviewsForProduct(shop, "456");

    expect(payload.count).toBe(2);
  });
});

describe("handleStorefrontReviewsRequest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("loads reviews through the real query path", async () => {
    const shop = "demo.myshopify.com";
    const productId = "gid://shopify/Product/123";
    const db = await createTestDatabase();
    await seedPublishedReviews(db, shop, productId);

    const { handleStorefrontReviewsRequest } = await import(
      "@/lib/reviews/storefront-request"
    );

    const result = await handleStorefrontReviewsRequest(
      new URLSearchParams({
        shop,
        product_id: productId,
        sort: "highest",
      })
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      count: 2,
      averageRating: 4.5,
    });
    expect((result.body as { reviews: { id: string }[] }).reviews[0]?.id).toBe(
      "pub-1"
    );
  });
});
