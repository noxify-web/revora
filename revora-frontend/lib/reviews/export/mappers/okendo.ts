import { buildCsv } from "../csv-builder";
import { formatOkendoDate } from "../dates";
import {
  getPlaceholderEmail,
  getReviewBody,
  getReviewerName,
  getReviewScore,
  joinPictures,
} from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

export function mapOkendoExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext
): string {
  const headers = [
    "name",
    "body",
    "handle",
    "productId",
    "rating",
    "sku",
    "dateCreated",
    "email",
    "imageUrls",
    "isApproved",
    "isVerifiedBuyer",
    "title",
  ];

  const rows = reviews.map((review) => [
    getReviewerName(review),
    getReviewBody(review),
    product.handle,
    product.numericId,
    String(getReviewScore(review)),
    "",
    formatOkendoDate(review.reviewTime),
    getPlaceholderEmail(review.temuReviewId),
    joinPictures(review.pictures),
    "true",
    "false",
    "",
  ]);

  return buildCsv(headers, rows);
}
