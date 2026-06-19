import { randomBytes, randomUUID } from "crypto"
import { and, eq, gt, isNull } from "drizzle-orm"

import {
  generateExtensionToken,
  revokeShopExtensionTokens,
} from "@/lib/extension/auth"
import { getAppBaseUrl } from "@/lib/extension/app-url"
import { encodePairingCode } from "@/lib/extension/pairing-code"
import { db } from "@/src/db"
import { connectCodes, extensionTokens } from "@/src/db/schema"

const CODE_TTL_MS = 10 * 60 * 1000

function generateConnectCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = randomBytes(6)
  let code = ""

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i] % alphabet.length]
  }

  return code
}

export async function createConnectCode(shop: string, request?: Request) {
  await revokeShopExtensionTokens(shop)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString()
  const code = generateConnectCode()

  await db.insert(connectCodes).values({
    id: randomUUID(),
    shop,
    code,
    expiresAt,
    createdAt: now.toISOString(),
  })

  const apiUrl = await getAppBaseUrl(request)

  return {
    code,
    expiresAt,
    apiUrl,
  }
}

export async function exchangeConnectCode(code: string, request?: Request) {
  const normalized = code.trim().toUpperCase()
  const now = new Date().toISOString()

  const record = await db.query.connectCodes.findFirst({
    where: and(
      eq(connectCodes.code, normalized),
      isNull(connectCodes.usedAt),
      gt(connectCodes.expiresAt, now)
    ),
  })

  if (!record) {
    throw new Error(
      "Connect code is invalid or expired. Generate a new one in Revora admin."
    )
  }

  await db
    .update(connectCodes)
    .set({ usedAt: now })
    .where(eq(connectCodes.id, record.id))

  await revokeShopExtensionTokens(record.shop)

  const { token, tokenHash } = generateExtensionToken()
  const tokenId = randomUUID()

  await db.insert(extensionTokens).values({
    id: tokenId,
    shop: record.shop,
    tokenHash,
    label: "Chrome extension",
    createdAt: now,
  })

  const apiUrl = await getAppBaseUrl(request)

  return {
    shop: record.shop,
    apiUrl,
    token,
    pairingCode: encodePairingCode({
      token,
      apiUrl,
    }),
  }
}
