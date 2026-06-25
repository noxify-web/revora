import { createHash, randomBytes } from "node:crypto";
import { TOKEN_TTL_MS } from "@revora/shared/constants";
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

/** Compute the ISO expiry timestamp `TOKEN_TTL_MS` from `now`. */
export function computeExpiry(now: number = Date.now()): string {
  return new Date(now + TOKEN_TTL_MS).toISOString();
}

/**
 * Set pairedAt on a token if it has never been paired (first /verify call).
 * Returns the token's pairedAt value (existing, or the one just written).
 */
export async function markTokenPaired(
  tokenId: string,
  nowIso: string = new Date().toISOString()
): Promise<string | null> {
  const record = await db.query.extensionTokens.findFirst({
    where: eq(extensionTokens.id, tokenId),
    columns: { pairedAt: true },
  });

  if (record?.pairedAt) {
    return record.pairedAt;
  }

  await db
    .update(extensionTokens)
    .set({ pairedAt: nowIso })
    .where(eq(extensionTokens.id, tokenId));

  return nowIso;
}

/** Roll the token's expiry forward on each successful /verify. */
export async function refreshTokenExpiry(tokenId: string): Promise<void> {
  await db
    .update(extensionTokens)
    .set({ expiresAt: computeExpiry() })
    .where(eq(extensionTokens.id, tokenId));
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

  // Reject expired tokens. Null expiresAt = legacy row minted before this column.
  if (record.expiresAt) {
    const expiresAtMs = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs < Date.now()) {
      return null;
    }
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const newExpiresAt = computeExpiry(now);

  await db
    .update(extensionTokens)
    .set({ lastUsedAt: nowIso, expiresAt: newExpiresAt })
    .where(eq(extensionTokens.id, record.id));

  // Mark paired on first verify (best-effort; failure here is non-fatal).
  const pairedAt = await markTokenPaired(record.id, nowIso);

  return { ...record, expiresAt: newExpiresAt, pairedAt };
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
