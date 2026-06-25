import { headers } from "next/headers";

import { getAppBaseUrl } from "@/lib/extension/app-url";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import {
  enforceRateLimit,
  getRequestClientKey,
} from "@/lib/extension/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_RATE_LIMIT_PER_IP = 60;

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  await enforceRateLimit(
    getRequestClientKey(request, "ext-health"),
    HEALTH_RATE_LIMIT_PER_IP
  );

  const apiUrl = await getAppBaseUrl(request);

  return extensionJsonResponse(
    {
      ok: true,
      apiUrl,
      service: "revora",
    },
    origin
  );
}
