import { buildCsv } from "../csv-builder";
import { formatJudgeMeDate } from "../dates";
import {
  getPlaceholderEmail,
  getProductUrl,
  getReviewBody,
  getReviewerName,
  getReviewScore,
  joinPictures,
} from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

export function mapJudgeMeExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext,
  shop: string
): string {
  const headers = [
    "title",
    "body",
    "rating",
    "review_date",
    "reviewer_name",
    "reviewer_email",
    "product_url",
    "picture_urls",
    "product_id",
    "product_handle",
  ];

  const rows = reviews.map((review) => [
    "",
    getReviewBody(review),
    String(getReviewScore(review)),
    formatJudgeMeDate(review.reviewTime),
    getReviewerName(review),
    getPlaceholderEmail(review.temuReviewId),
    getProductUrl(shop, product),
    joinPictures(review.pictures),
    product.numericId,
    product.handle,
  ]);

  return buildCsv(headers, rows);
}
