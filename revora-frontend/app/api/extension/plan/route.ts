import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { enforceRateLimit } from "@/lib/extension/rate-limit";
import { resolveShopPlan } from "@/lib/shopify/resolve-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_RATE_LIMIT_PER_TOKEN = 30;

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
    `ext-plan:${token.tokenHash}`,
    PLAN_RATE_LIMIT_PER_TOKEN
  );

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
