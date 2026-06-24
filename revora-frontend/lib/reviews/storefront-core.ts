import { parseStoredPictures } from "@/lib/extension/pictures";

export const REVIEW_SORT_OPTIONS = [
  "recent",
  "highest",
  "lowest",
  "helpful",
] as const;

export type ReviewSort = (typeof REVIEW_SORT_OPTIONS)[number];

export interface StorefrontReviewRow {
  authorName: string | null;
  comment: string | null;
  createdAt: string;
  helpfulCount: number;
  id: string;
  notHelpfulCount: number;
  pictures: string | null;
  publishedAt: string | null;
  reviewTime: number | null;
  score: number | null;
  syncStatus: string;
  translatedComment: string | null;
}

export interface StorefrontReviewItem {
  authorName: string;
  comment: string;
  helpfulCount: number;
  id: string;
  notHelpfulCount: number;
  pictures: string[];
  reviewDate: string;
  score: number;
}

export interface StorefrontReviewsPayload {
  averageRating: number;
  count: number;
  reviews: StorefrontReviewItem[];
}

export interface StorefrontQueryOptions {
  limit?: number;
  photosOnly?: boolean;
  sort?: ReviewSort;
  summaryOnly?: boolean;
}

const DEFAULT_REVIEW_LIMIT = 30;
const MAX_REVIEW_LIMIT = 30;

function reviewComment(review: StorefrontReviewRow) {
  return (review.translatedComment || review.comment || "").trim();
}

function formatReviewDate(review: StorefrontReviewRow) {
  if (review.reviewTime) {
    return new Date(review.reviewTime * 1000).toISOString().slice(0, 10);
  }

  if (review.publishedAt) {
    return review.publishedAt.slice(0, 10);
  }

  return review.createdAt.slice(0, 10);
}

function clampScore(score: number | null) {
  return Math.min(5, Math.max(1, score ?? 5));
}

export function mapStorefrontReview(review: StorefrontReviewRow) {
  return {
    id: review.id,
    authorName: review.authorName || "Customer",
    comment: reviewComment(review) || "Great product!",
    score: clampScore(review.score),
    reviewDate: formatReviewDate(review),
    pictures: parseStoredPictures(review.pictures),
    helpfulCount: review.helpfulCount ?? 0,
    notHelpfulCount: review.notHelpfulCount ?? 0,
  };
}

export function filterPublishedReviews(rows: StorefrontReviewRow[]) {
  return rows.filter((review) => review.syncStatus === "published");
}

export function filterPhotosOnlyReviews(reviews: StorefrontReviewItem[]) {
  return reviews.filter((review) => review.pictures.length > 0);
}

export function sortStorefrontReviews(
  reviews: StorefrontReviewItem[],
  sort: ReviewSort
) {
  const sorted = [...reviews];

  switch (sort) {
    case "highest":
      sorted.sort((left, right) => right.score - left.score);
      break;
    case "lowest":
      sorted.sort((left, right) => left.score - right.score);
      break;
    case "helpful":
      sorted.sort((left, right) => right.helpfulCount - left.helpfulCount);
      break;
    default:
      sorted.sort(
        (left, right) =>
          Date.parse(right.reviewDate) - Date.parse(left.reviewDate)
      );
      break;
  }

  return sorted;
}

export function buildStorefrontReviewsPayload(
  rows: StorefrontReviewRow[],
  options?: StorefrontQueryOptions
): StorefrontReviewsPayload {
  const published = filterPublishedReviews(rows).map(mapStorefrontReview);
  const sort = options?.sort ?? "recent";
  const photosOnly = options?.photosOnly ?? false;
  const limit = Math.min(
    MAX_REVIEW_LIMIT,
    options?.limit ?? DEFAULT_REVIEW_LIMIT
  );

  let reviews = sortStorefrontReviews(published, sort);

  if (photosOnly) {
    reviews = filterPhotosOnlyReviews(reviews);
  }

  const scores = published.map((review) => review.score);
  const averageRating = scores.length
    ? Number(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(
          1
        )
      )
    : 0;

  return {
    count: published.length,
    averageRating,
    reviews: options?.summaryOnly ? [] : reviews.slice(0, limit),
  };
}

export function parseReviewSort(value: string | null): ReviewSort | undefined {
  if (!value) {
    return;
  }

  const normalized = value.trim().toLowerCase();
  return REVIEW_SORT_OPTIONS.includes(normalized as ReviewSort)
    ? (normalized as ReviewSort)
    : undefined;
}

export function parseStorefrontQueryOptions(searchParams: URLSearchParams) {
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const sort = parseReviewSort(searchParams.get("sort"));
  const photosOnly = searchParams.get("photos_only") === "1";
  const summaryOnly = searchParams.get("summary_only") === "1";

  const limit =
    parsedLimit === undefined
      ? undefined
      : Math.min(MAX_REVIEW_LIMIT, parsedLimit);

  return {
    limit,
    sort,
    photosOnly,
    summaryOnly,
    invalidLimit: limit !== undefined && (!Number.isFinite(limit) || limit < 1),
    invalidSort:
      searchParams.has("sort") && searchParams.get("sort")?.trim() && !sort,
  };
}
