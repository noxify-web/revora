import { buildCsv } from "../csv-builder";
import { formatIsoDate } from "../dates";
import {
  getPlaceholderEmail,
  getReviewBody,
  getReviewerName,
  getReviewScore,
  joinPictures,
} from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

export function mapLooxExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext
): string {
  const headers = [
    "product_handle",
    "product_Id",
    "rating",
    "author",
    "email",
    "body",
    "created_at",
    "photo_url",
    "reply",
    "replied_at",
    "verified_purchase",
    "incentivized",
  ];

  const rows = reviews.map((review) => [
    product.handle,
    product.numericId,
    String(getReviewScore(review)),
    getReviewerName(review),
    getPlaceholderEmail(review.temuReviewId),
    getReviewBody(review),
    formatIsoDate(review.reviewTime),
    joinPictures(review.pictures),
    "",
    "",
    "",
    "",
  ]);

  return buildCsv(headers, rows);
}
