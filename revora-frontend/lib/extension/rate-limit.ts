import { eq } from "drizzle-orm"

import { db } from "@/src/db"
import { rateLimits } from "@/src/db/schema"

const WINDOW_MS = 15 * 60 * 1000

export async function enforceRateLimit(
  key: string,
  maxAttempts: number,
): Promise<void> {
  const now = Date.now()
  const record = await db.query.rateLimits.findFirst({
    where: eq(rateLimits.key, key),
  })

  if (!record) {
    await db.insert(rateLimits).values({
      key,
      count: 1,
      windowStart: new Date(now).toISOString(),
    })
    return
  }

  const windowStart = new Date(record.windowStart).getTime()

  if (now - windowStart > WINDOW_MS) {
    await db
      .update(rateLimits)
      .set({
        count: 1,
        windowStart: new Date(now).toISOString(),
      })
      .where(eq(rateLimits.key, key))
    return
  }

  if (record.count >= maxAttempts) {
    throw new Error("Too many attempts. Wait a few minutes and try again.")
  }

  await db
    .update(rateLimits)
    .set({ count: record.count + 1 })
    .where(eq(rateLimits.key, key))
}

export function getRequestClientKey(request: Request, prefix: string) {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "unknown"
  return `${prefix}:${ip}`
}
