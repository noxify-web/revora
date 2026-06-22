import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { getAppBaseUrl } from "@/lib/extension/app-url";
import {
  generateExtensionToken,
  revokeShopExtensionTokens,
} from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { withAdminApi } from "@/lib/shopify/authenticate-admin";
import { resolveShopPlan } from "@/lib/shopify/resolve-plan";
import { db } from "@/src/db";
import { extensionTokens } from "@/src/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  return withAdminApi(
    request,
    async ({ shop }) => {
      const body = (await request.json().catch(() => ({}))) as {
        label?: string;
      };

      await revokeShopExtensionTokens(shop);

      const { token, tokenHash } = generateExtensionToken();
      const now = new Date().toISOString();
      const resolved = await resolveShopPlan(shop);
      const label = body.label?.trim() || "Chrome extension";

      await db.insert(extensionTokens).values({
        id: randomUUID(),
        shop,
        tokenHash,
        label,
        createdAt: now,
      });

      const apiUrl = await getAppBaseUrl(request);

      return extensionJsonResponse(
        {
          token,
          apiUrl,
          shop,
          plan: resolved.plan,
          planName: resolved.planName,
          reviewLimit: resolved.reviewLimit,
          label,
          createdAt: now,
        },
        origin,
        { status: 201 }
      );
    },
    {
      logPrefix: "Revora extension token POST failed",
      defaultErrorMessage: "Failed to connect extension",
    }
  );
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  return withAdminApi(
    request,
    async ({ shop }) => {
      const tokens = await db.query.extensionTokens.findMany({
        where: and(
          eq(extensionTokens.shop, shop),
          isNull(extensionTokens.revokedAt)
        ),
        orderBy: [desc(extensionTokens.createdAt)],
        columns: {
          id: true,
          label: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });

      return extensionJsonResponse({ tokens }, origin);
    },
    {
      logPrefix: "Revora extension token GET failed",
      defaultErrorMessage: "Failed to load extension status",
    }
  );
}

export async function DELETE(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const url = new URL(request.url);
  const tokenId = url.searchParams.get("id");

  if (!tokenId) {
    return extensionJsonResponse({ error: "Missing token id" }, origin, {
      status: 400,
    });
  }

  return withAdminApi(
    request,
    async ({ shop }) => {
      await db
        .update(extensionTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(
          and(eq(extensionTokens.id, tokenId), eq(extensionTokens.shop, shop))
        );

      return extensionJsonResponse({ revoked: true }, origin);
    },
    {
      logPrefix: "Revora extension token DELETE failed",
      defaultErrorMessage: "Failed to revoke extension token",
    }
  );
}
