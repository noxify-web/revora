import { eq } from "drizzle-orm"

import type { PlanId } from "@/lib/plans"
import { db } from "@/src/db"
import { shopPlans } from "@/src/db/schema"

export async function getShopPlan(shop: string): Promise<PlanId> {
  const record = await db.query.shopPlans.findFirst({
    where: eq(shopPlans.shop, shop),
  })

  if (record?.plan === "premium") {
    return "premium"
  }

  return "free"
}

export async function ensureShopPlan(shop: string) {
  const existing = await db.query.shopPlans.findFirst({
    where: eq(shopPlans.shop, shop),
  })

  if (existing) {
    return existing
  }

  const now = new Date().toISOString()

  await db.insert(shopPlans).values({
    shop,
    plan: "free",
    updatedAt: now,
  })

  return {
    shop,
    plan: "free" as const,
    subscriptionId: null,
    updatedAt: now,
  }
}

export async function setShopPlan(
  shop: string,
  plan: PlanId,
  subscriptionId?: string | null,
) {
  await ensureShopPlan(shop)

  await db
    .update(shopPlans)
    .set({
      plan,
      subscriptionId: subscriptionId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(shopPlans.shop, shop))
}
