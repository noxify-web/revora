import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { resolveShopPlan } from "@/lib/shopify/resolve-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const resolved = await resolveShopPlan(token.shop);

  return extensionJsonResponse(
    {
      shop: token.shop,
      plan: resolved.plan,
      planName: resolved.planName,
      reviewLimit: resolved.reviewLimit,
    },
    origin
  );
}
