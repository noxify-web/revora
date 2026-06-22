import { headers } from "next/headers";

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { publishImportToStorefront } from "@/lib/reviews/publish";
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

export async function POST(request: Request, context: RouteContext) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const { id } = await context.params;

  return withAdminApi(
    request,
    async ({ session }) =>
      extensionJsonResponse(
        await publishImportToStorefront(session, id),
        origin
      ),
    {
      defaultErrorStatus: 400,
      defaultErrorMessage: "Failed to publish reviews",
    }
  );
}
