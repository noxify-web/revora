import { headers } from "next/headers";

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { getShopAutoPublish, setShopAutoPublish } from "@/lib/reviews/settings";
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

  return withAdminApi(
    request,
    async ({ session }) =>
      extensionJsonResponse(
        { autoPublishReviews: await getShopAutoPublish(session.shop) },
        origin
      ),
    { defaultErrorMessage: "Failed to load settings" }
  );
}

export async function PATCH(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  return withAdminApi(
    request,
    async ({ session }) => {
      const body = (await request.json()) as {
        autoPublishReviews?: boolean;
      };

      if (typeof body.autoPublishReviews !== "boolean") {
        return extensionJsonResponse(
          { error: "autoPublishReviews must be a boolean" },
          origin,
          { status: 400 }
        );
      }

      await setShopAutoPublish(session.shop, body.autoPublishReviews);

      return extensionJsonResponse(
        { autoPublishReviews: body.autoPublishReviews },
        origin
      );
    },
    {
      defaultErrorStatus: 400,
      defaultErrorMessage: "Failed to update settings",
    }
  );
}
