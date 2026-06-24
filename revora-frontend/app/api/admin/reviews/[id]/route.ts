import { headers } from "next/headers";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { updateReviewModeration } from "@/lib/reviews/admin";
import { withAdminApi } from "@/lib/shopify/authenticate-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const { id } = await context.params;

  return withAdminApi(
    request,
    async ({ session }) => {
      const body = (await request.json()) as { action?: string };
      const action = body.action;

      if (
        action !== "approve" &&
        action !== "unpublish" &&
        action !== "reject"
      ) {
        return extensionJsonResponse(
          { error: "Invalid moderation action" },
          origin,
          { status: 400 }
        );
      }

      return extensionJsonResponse(
        await updateReviewModeration(session.shop, id, action),
        origin
      );
    },
    {
      defaultErrorStatus: 400,
      defaultErrorMessage: "Failed to update review",
    }
  );
}
