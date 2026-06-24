import { headers } from "next/headers";

import { handleStorefrontReviewsRequest } from "@/lib/reviews/storefront-request";
import { submitStorefrontReview } from "@/lib/reviews/submit";
import {
  storefrontJsonResponse,
  storefrontOptionsResponse,
} from "@/lib/storefront/cors";

export async function OPTIONS() {
  const headerStore = await headers();
  return storefrontOptionsResponse(headerStore.get("origin"));
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const url = new URL(request.url);

  try {
    const result = await handleStorefrontReviewsRequest(url.searchParams);
    return storefrontJsonResponse(result.body, origin, {
      status: result.status,
    });
  } catch (error) {
    return storefrontJsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load storefront reviews",
      },
      origin,
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  try {
    const body = await request.json();
    const result = await submitStorefrontReview(request, body);
    return storefrontJsonResponse(result, origin, { status: 201 });
  } catch (error) {
    return storefrontJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit review",
      },
      origin,
      { status: 400 }
    );
  }
}
