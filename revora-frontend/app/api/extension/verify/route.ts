import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { enforceRateLimit } from "@/lib/extension/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_RATE_LIMIT_PER_TOKEN = 60;

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function GET() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const token = await authenticateExtensionToken(
    headerStore.get("authorization")
  );

  if (!token) {
    return extensionJsonResponse({ error: "Invalid extension token" }, origin, {
      status: 401,
    });
  }

  await enforceRateLimit(
    `ext-verify:${token.tokenHash}`,
    VERIFY_RATE_LIMIT_PER_TOKEN
  );

  return extensionJsonResponse(
    {
      shop: token.shop,
      label: token.label,
      paired: true,
      pairedAt: token.pairedAt,
      expiresAt: token.expiresAt,
    },
    origin
  );
}
