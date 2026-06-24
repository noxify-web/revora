import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { db } from "@/src/db";
import { extensionTokens } from "@/src/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function POST() {
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

  const now = new Date().toISOString();

  await db
    .update(extensionTokens)
    .set({ revokedAt: now })
    .where(eq(extensionTokens.id, token.id));

  return extensionJsonResponse({ disconnected: true }, origin);
}
