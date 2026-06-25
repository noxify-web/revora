import { headers } from "next/headers";

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { withAdminApi } from "@/lib/shopify/authenticate-admin";
import { getMissingConfiguredScopes } from "@/lib/shopify/required-scopes";

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
    async ({ session }) => {
      const missingScopes = getMissingConfiguredScopes(session);

      return await Promise.resolve(
        extensionJsonResponse(
          {
            missingScopes,
            scopeUpgradeRequired: missingScopes.length > 0,
            grantedScopes: session.scope?.split(/[,\s]+/).filter(Boolean) ?? [],
          },
          origin
        )
      );
    },
    { defaultErrorMessage: "Failed to read app scope status" }
  );
}
