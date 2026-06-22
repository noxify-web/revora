import { describe, expect, it } from "vitest";

import { buildCsv } from "../csv-builder";
import { formatIsoDate, formatJudgeMeDate, formatStampedDate } from "../dates";
import { buildCustomCsv } from "../mappers/custom";
import { mapJudgeMeExport } from "../mappers/judge-me";
import { mapLooxExport } from "../mappers/loox";
import { mapYotpoExport } from "../mappers/yotpo";
import { getPlaceholderEmail } from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

const product: ExportProductContext = {
  id: "gid://shopify/Product/1769449553131",
  numericId: "1769449553131",
  handle: "blue-t-shirt",
  title: "Blue T-Shirt",
  url: "https://demo.myshopify.com/products/blue-t-shirt",
  imageUrl: "https://cdn.shopify.com/image.jpg",
};

const review: ExportReviewRecord = {
  temuReviewId: "temu-99",
  comment: "Loved it",
  translatedComment: "Me encanta",
  score: 5,
  authorName: "Alex",
  reviewTime: 1_704_067_200,
  pictures: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
  shopifyProductId: product.id,
  syncStatus: "published",
};

describe("export date formatting", () => {
  it("formats Judge.me dates as dd/mm/yyyy", () => {
    expect(formatJudgeMeDate(review.reviewTime)).toBe("01/01/2024");
  });

  it("formats ISO dates as YYYY-MM-DD", () => {
    expect(formatIsoDate(review.reviewTime)).toBe("2024-01-01");
  });

  it("formats Stamped dates with time", () => {
    expect(formatStampedDate(review.reviewTime)).toBe("2024-01-01 00:00:00");
  });
});

describe("export mappers", () => {
  it("maps Judge.me CSV with expected headers and values", () => {
    const csv = mapJudgeMeExport([review], product, "demo.myshopify.com");
    const lines = csv.trim().split("\r\n");

    expect(lines[0]).toBe(
      "title,body,rating,review_date,reviewer_name,reviewer_email,product_url,picture_urls,product_id,product_handle"
    );
    expect(lines[1]).toContain("Me encanta");
    expect(lines[1]).toContain("Alex");
    expect(lines[1]).toContain(getPlaceholderEmail("temu-99"));
    expect(lines[1]).toContain("blue-t-shirt");
    expect(lines[1]).toContain(
      "https://cdn.example/a.jpg,https://cdn.example/b.jpg"
    );
  });

  it("maps Loox CSV with product handle and photo URLs", () => {
    const csv = mapLooxExport([review], product);
    const lines = csv.trim().split("\r\n");

    expect(lines[0]).toContain("product_handle");
    expect(lines[1]).toContain("blue-t-shirt");
    expect(lines[1]).toContain("Me encanta");
  });

  it("maps Yotpo CSV with semicolon-separated image URLs", () => {
    const csv = mapYotpoExport([review], product);

    expect(csv).toContain("Shopify Product Handle");
    expect(csv).toContain(
      "https://cdn.example/a.jpg;https://cdn.example/b.jpg"
    );
    expect(csv).toContain("TRUE");
  });

  it("builds custom CSV with selected fields only", () => {
    const csv = buildCustomCsv([review], product, [
      "authorName",
      "score",
      "productHandle",
    ]);
    const lines = csv.trim().split("\r\n");

    expect(lines[0]).toBe("Author name,Rating (1–5),Product handle");
    expect(lines[1]).toBe("Alex,5,blue-t-shirt");
  });
});

describe("csv builder", () => {
  it("escapes commas and quotes", () => {
    const csv = buildCsv(["comment"], [['He said "great", really']]);
    expect(csv).toContain('"He said ""great"", really"');
  });
});
