import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/src/db";
import { extensionTokens } from "@/src/db/schema";

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateExtensionToken() {
  const token = `rvr_${randomBytes(32).toString("hex")}`;
  return {
    token,
    tokenHash: hashExtensionToken(token),
  };
}

export async function authenticateExtensionToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const tokenHash = hashExtensionToken(token);
  const record = await db.query.extensionTokens.findFirst({
    where: and(
      eq(extensionTokens.tokenHash, tokenHash),
      isNull(extensionTokens.revokedAt)
    ),
  });

  if (!record) {
    return null;
  }

  await db
    .update(extensionTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(extensionTokens.id, record.id));

  return record;
}

export async function revokeShopExtensionTokens(shop: string) {
  const now = new Date().toISOString();

  await db
    .update(extensionTokens)
    .set({ revokedAt: now })
    .where(
      and(eq(extensionTokens.shop, shop), isNull(extensionTokens.revokedAt))
    );
}
