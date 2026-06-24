import { describe, expect, it } from "vitest";

import {
  buildStorefrontReviewsPayload,
  filterPhotosOnlyReviews,
  parseStorefrontQueryOptions,
  type StorefrontReviewRow,
  sortStorefrontReviews,
} from "@/lib/reviews/storefront-core";

const sampleRows: StorefrontReviewRow[] = [
  {
    id: "1",
    authorName: "Alice",
    comment: "Great",
    translatedComment: null,
    score: 5,
    reviewTime: 1_700_000_000,
    pictures: '["https://example.com/a.jpg"]',
    helpfulCount: 3,
    notHelpfulCount: 0,
    syncStatus: "published",
    publishedAt: "2024-01-02T00:00:00.000Z",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "2",
    authorName: "Bob",
    comment: "Okay",
    translatedComment: null,
    score: 3,
    reviewTime: 1_800_000_000,
    pictures: null,
    helpfulCount: 10,
    notHelpfulCount: 1,
    syncStatus: "published",
    publishedAt: "2024-06-02T00:00:00.000Z",
    createdAt: "2024-06-02T00:00:00.000Z",
  },
  {
    id: "3",
    authorName: "Cara",
    comment: "Pending",
    translatedComment: null,
    score: 4,
    reviewTime: 1_900_000_000,
    pictures: null,
    helpfulCount: 0,
    notHelpfulCount: 0,
    syncStatus: "pending",
    publishedAt: null,
    createdAt: "2024-09-02T00:00:00.000Z",
  },
];

describe("storefront review transforms", () => {
  it("builds aggregate payload and excludes non-published reviews", () => {
    const payload = buildStorefrontReviewsPayload(sampleRows);

    expect(payload.count).toBe(2);
    expect(payload.averageRating).toBe(4);
    expect(payload.reviews).toHaveLength(2);
    expect(payload.reviews.map((review) => review.id)).toEqual(["2", "1"]);
  });

  it("filters photos-only reviews", () => {
    const published = buildStorefrontReviewsPayload(sampleRows).reviews;
    const photosOnly = filterPhotosOnlyReviews(published);

    expect(photosOnly).toHaveLength(1);
    expect(photosOnly[0]?.id).toBe("1");
  });

  it("sorts reviews by helpful and highest rating", () => {
    const published = buildStorefrontReviewsPayload(sampleRows).reviews;

    expect(
      sortStorefrontReviews(published, "helpful").map((review) => review.id)
    ).toEqual(["2", "1"]);
    expect(
      sortStorefrontReviews(published, "highest").map((review) => review.id)
    ).toEqual(["1", "2"]);
  });

  it("returns summary-only payload without review list", () => {
    const payload = buildStorefrontReviewsPayload(sampleRows, {
      summaryOnly: true,
    });

    expect(payload.count).toBe(2);
    expect(payload.averageRating).toBe(4);
    expect(payload.reviews).toEqual([]);
  });

  it("parses storefront query params", () => {
    const params = new URLSearchParams({
      sort: "helpful",
      photos_only: "1",
      summary_only: "1",
      limit: "12",
    });

    const parsed = parseStorefrontQueryOptions(params);

    expect(parsed.sort).toBe("helpful");
    expect(parsed.photosOnly).toBe(true);
    expect(parsed.summaryOnly).toBe(true);
    expect(parsed.limit).toBe(12);
    expect(parsed.invalidSort).toBe(false);
  });

  it("flags invalid sort and limit params", () => {
    const params = new URLSearchParams({
      sort: "invalid",
      limit: "0",
    });

    const parsed = parseStorefrontQueryOptions(params);

    expect(parsed.invalidSort).toBe(true);
    expect(parsed.invalidLimit).toBe(true);
  });
});
