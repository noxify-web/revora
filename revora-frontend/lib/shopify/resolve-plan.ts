import type { Session } from "@shopify/shopify-api"

import type { PlanId } from "@/lib/plans"
import { PLANS, getReviewLimitForPlan } from "@/lib/plans"
import { getBillingStatus } from "@/lib/shopify/billing"
import {
  ensureShopPlan,
  getShopPlan,
  setShopPlan,
} from "@/lib/shopify/plan-store"
import { getShopify, sessionStorage } from "@/lib/shopify/shopify"

export type ResolvedShopPlan = {
  plan: PlanId
  planName: string
  reviewLimit: number | null
  subscriptionId: string | null
  hasActiveSubscription: boolean
}

export async function loadOfflineSession(shop: string) {
  const shopify = getShopify()
  const offlineId = shopify.session.getOfflineId(shop)
  const session = await sessionStorage.loadSession(offlineId)
  return session?.accessToken ? session : null
}

export async function resolveShopPlan(
  shop: string,
  session?: Session | null,
): Promise<ResolvedShopPlan> {
  await ensureShopPlan(shop)

  const activeSession = session ?? (await loadOfflineSession(shop))

  if (activeSession) {
    const billing = await getBillingStatus(activeSession)
    const plan: PlanId = billing.hasActiveSubscription ? "premium" : "free"
    const localPlan = await getShopPlan(shop)

    if (
      localPlan !== plan ||
      (billing.subscriptionId &&
        billing.subscriptionId !== (await getStoredSubscriptionId(shop)))
    ) {
      await setShopPlan(shop, plan, billing.subscriptionId)
    }

    return {
      plan,
      planName: PLANS[plan].name,
      reviewLimit: getReviewLimitForPlan(plan),
      subscriptionId: billing.subscriptionId,
      hasActiveSubscription: billing.hasActiveSubscription,
    }
  }

  const plan = await getShopPlan(shop)

  return {
    plan,
    planName: PLANS[plan].name,
    reviewLimit: getReviewLimitForPlan(plan),
    subscriptionId: null,
    hasActiveSubscription: plan === "premium",
  }
}

async function getStoredSubscriptionId(shop: string) {
  const record = await ensureShopPlan(shop)
  return record.subscriptionId ?? null
}
