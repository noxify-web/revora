import { headers } from "next/headers";

import { getAppBaseUrl } from "@/lib/extension/app-url";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
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
