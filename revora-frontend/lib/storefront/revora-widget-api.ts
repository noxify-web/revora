import type { ReviewsPayload, SortOption } from "./revora-widget-types";

export const REVORA_REVIEWS_API_PATH = "/apps/revora/reviews";

export interface FetchReviewsOptions {
  limit: number;
  photosOnly?: boolean;
  sort?: SortOption;
  summaryOnly?: boolean;
}

export function fetchReviews(
  shop: string,
  productId: string,
  options: FetchReviewsOptions
) {
  const params = new URLSearchParams({
    shop,
    product_id: String(productId),
    limit: String(options.limit),
  });

  if (options.summaryOnly) {
    params.set("summary_only", "1");
  }

  if (options.sort) {
    params.set("sort", options.sort);
  }

  if (options.photosOnly) {
    params.set("photos_only", "1");
  }

  return fetch(`${REVORA_REVIEWS_API_PATH}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Revora reviews request failed (${response.status})`);
    }

    return response.json() as Promise<ReviewsPayload>;
  });
}

export function submitReview(
  shop: string,
  productId: string,
  payload: Record<string, string | number>
) {
  return fetch(REVORA_REVIEWS_API_PATH, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      shop,
      productId,
      ...payload,
    }),
  }).then(async (response) => {
    const data = (await response.json()) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || "Failed to submit review");
    }

    return data;
  });
}

export function voteReview(shop: string, reviewId: string, vote: string) {
  return fetch(`${REVORA_REVIEWS_API_PATH}/${reviewId}/vote`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ shop, vote }),
  }).then(async (response) => {
    const data = (await response.json()) as {
      error?: string;
      helpfulCount?: number;
      notHelpfulCount?: number;
    };
    if (!response.ok) {
      throw new Error(data.error || "Failed to vote");
    }

    return data;
  });
}
