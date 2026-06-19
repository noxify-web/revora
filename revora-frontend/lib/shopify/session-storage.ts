import { Session } from "@shopify/shopify-api"
import type { SessionStorage } from "@shopify/shopify-app-session-storage"
import { eq, inArray } from "drizzle-orm"

import { db } from "@/src/db"
import { sessions } from "@/src/db/schema"

function sessionToRow(session: Session) {
  const sessionParams = session.toObject()

  return {
    id: session.id,
    shop: session.shop,
    state: session.state,
    isOnline: session.isOnline,
    scope: session.scope ?? null,
    expires: session.expires ? session.expires.toISOString() : null,
    accessToken: session.accessToken ?? "",
    userId: sessionParams.onlineAccessInfo?.associated_user.id ?? null,
    firstName:
      sessionParams.onlineAccessInfo?.associated_user.first_name ?? null,
    lastName: sessionParams.onlineAccessInfo?.associated_user.last_name ?? null,
    email: sessionParams.onlineAccessInfo?.associated_user.email ?? null,
    accountOwner:
      sessionParams.onlineAccessInfo?.associated_user.account_owner ?? null,
    locale: sessionParams.onlineAccessInfo?.associated_user.locale ?? null,
    collaborator:
      sessionParams.onlineAccessInfo?.associated_user.collaborator ?? null,
    emailVerified:
      sessionParams.onlineAccessInfo?.associated_user.email_verified ?? null,
    refreshToken: sessionParams.refreshToken ?? null,
    refreshTokenExpires: sessionParams.refreshTokenExpires
      ? sessionParams.refreshTokenExpires.toISOString()
      : null,
  }
}

function rowToSession(row: typeof sessions.$inferSelect): Session {
  const sessionParams: Record<string, boolean | string | number> = {
    id: row.id,
    shop: row.shop,
    state: row.state,
    isOnline: row.isOnline,
  }

  if (row.userId != null) sessionParams.userId = String(row.userId)
  if (row.firstName) sessionParams.firstName = row.firstName
  if (row.lastName) sessionParams.lastName = row.lastName
  if (row.email) sessionParams.email = row.email
  if (row.locale) sessionParams.locale = row.locale
  if (row.accountOwner != null) sessionParams.accountOwner = row.accountOwner
  if (row.collaborator != null) sessionParams.collaborator = row.collaborator
  if (row.emailVerified != null)
    sessionParams.emailVerified = row.emailVerified
  if (row.expires) sessionParams.expires = new Date(row.expires).getTime()
  if (row.scope) sessionParams.scope = row.scope
  if (row.accessToken) sessionParams.accessToken = row.accessToken
  if (row.refreshToken) sessionParams.refreshToken = row.refreshToken
  if (row.refreshTokenExpires) {
    sessionParams.refreshTokenExpires = new Date(
      row.refreshTokenExpires,
    ).getTime()
  }

  return Session.fromPropertyArray(Object.entries(sessionParams), true)
}

export class DrizzleSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    const data = sessionToRow(session)

    await db
      .insert(sessions)
      .values(data)
      .onConflictDoUpdate({
        target: sessions.id,
        set: data,
      })

    return true
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const [row] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    return row ? rowToSession(row) : undefined
  }

  async deleteSession(id: string): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.id, id))
    return true
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true
    await db.delete(sessions).where(inArray(sessions.id, ids))
    return true
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.shop, shop))
      .limit(25)

    return rows.map(rowToSession)
  }
}

export const sessionStorage = new DrizzleSessionStorage()