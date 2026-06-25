import { headers } from "next/headers";

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import {
  refreshOfflineSession,
  withAdminApi,
} from "@/lib/shopify/authenticate-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSessionToken(
  authorizationHeader: string | null,
  idToken: string | null
) {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.replace("Bearer ", "");
  }

  return idToken;
}

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const url = new URL(request.url);

  return withAdminApi(
    request,
    async ({ shop }) => {
      const sessionToken = getSessionToken(
        headerStore.get("authorization"),
        url.searchParams.get("id_token")
      );

      if (!sessionToken) {
        return extensionJsonResponse(
          { error: "Missing Shopify session token" },
          origin,
          { status: 401 }
        );
      }

      const result = await refreshOfflineSession(shop, sessionToken);

      return extensionJsonResponse(
        {
          scopeUpgradeRequired: result.scopeUpgradeRequired,
          missingScopes: result.missingScopes,
          grantedScopes: result.session.scope?.split(/[,\s]+/).filter(Boolean),
        },
        origin
      );
    },
    { defaultErrorMessage: "Failed to refresh app session" }
  );
}
