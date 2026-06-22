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

export function mapYotpoExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext
): string {
  const headers = [
    "Shopify Product Handle",
    "Review Creation Date",
    "Review Content",
    "Review Score",
    "Review Title",
    "Reviewer Display Name",
    "Reviewer Email",
    "Publish Review",
    "Comment Content",
    "Comment Date",
    "Review Image URLs",
  ];

  const rows = reviews.map((review) => [
    product.handle,
    formatIsoDate(review.reviewTime),
    getReviewBody(review),
    String(getReviewScore(review)),
    "",
    getReviewerName(review),
    getPlaceholderEmail(review.temuReviewId),
    "TRUE",
    "",
    "",
    joinPictures(review.pictures, ";"),
  ]);

  return buildCsv(headers, rows);
}
