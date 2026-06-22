import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { processImportBatch } from "@/lib/extension/import";
import { importBatchSchema } from "@/lib/extension/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function POST(request: Request) {
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

  try {
    const body = importBatchSchema.parse(await request.json());
    const result = await processImportBatch(token.shop, body);
    return extensionJsonResponse(result, origin);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import reviews";

    return extensionJsonResponse({ error: message }, origin, { status: 400 });
  }
}
