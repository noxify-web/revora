import { describe, expect, it } from "vitest";

import { handleStorefrontReviewsRequest } from "@/lib/reviews/storefront-request";

describe("handleStorefrontReviewsRequest validation", () => {
  it("rejects missing shop", async () => {
    const result = await handleStorefrontReviewsRequest(
      new URLSearchParams({ product_id: "123" })
    );

    expect(result.status).toBe(400);
  });

  it("rejects invalid sort and limit params", async () => {
    const result = await handleStorefrontReviewsRequest(
      new URLSearchParams({
        shop: "demo.myshopify.com",
        product_id: "123",
        sort: "invalid",
        limit: "0",
      })
    );

    expect(result.status).toBe(400);
  });
});
