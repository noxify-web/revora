import { headers } from "next/headers";

import { voteOnStorefrontReview } from "@/lib/reviews/vote";
import {
  storefrontJsonResponse,
  storefrontOptionsResponse,
} from "@/lib/storefront/cors";

export async function OPTIONS() {
  const headerStore = await headers();
  return storefrontOptionsResponse(headerStore.get("origin"));
}

interface VoteRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: VoteRouteContext) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = await voteOnStorefrontReview(request, id, body);
    return storefrontJsonResponse(result, origin);
  } catch (error) {
    return storefrontJsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to record vote",
      },
      origin,
      { status: 400 }
    );
  }
}
