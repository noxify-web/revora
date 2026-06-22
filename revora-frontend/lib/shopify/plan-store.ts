import { eq } from "drizzle-orm";

import type { PlanId } from "@/lib/plans";
import { db } from "@/src/db";
import { shopPlans } from "@/src/db/schema";

export function getShopPlan(): Promise<PlanId> {
  return Promise.resolve("free");
}

export async function ensureShopPlan(shop: string) {
  const existing = await db.query.shopPlans.findFirst({
    where: eq(shopPlans.shop, shop),
  });

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();

  await db.insert(shopPlans).values({
    shop,
    plan: "free",
    updatedAt: now,
  });

  return {
    shop,
    plan: "free" as const,
    subscriptionId: null,
    updatedAt: now,
  };
}
