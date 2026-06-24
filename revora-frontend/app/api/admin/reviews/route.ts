import { headers } from "next/headers";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import type { AdminReviewStatus } from "@/lib/reviews/admin";
import {
  countAdminReviewsByStatus,
  listAdminReviews,
} from "@/lib/reviews/admin";
import { withAdminApi } from "@/lib/shopify/authenticate-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "all") as AdminReviewStatus;
  const productId = url.searchParams.get("product_id") ?? undefined;

  return withAdminApi(
    request,
    async ({ session }) =>
      extensionJsonResponse(
        {
          reviews: await listAdminReviews(session.shop, {
            status,
            productId,
          }),
          pendingCount: await countAdminReviewsByStatus(
            session.shop,
            "pending"
          ),
        },
        origin
      ),
    { defaultErrorMessage: "Failed to load reviews" }
  );
}
