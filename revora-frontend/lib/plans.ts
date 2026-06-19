export type PlanId = "free" | "premium"

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    reviewLimitPerImport: 100,
    priceMonthly: 0,
  },
  premium: {
    id: "premium" as const,
    name: "Premium",
    reviewLimitPerImport: null as number | null,
    priceMonthly: 9.99,
  },
} satisfies Record<PlanId, {
  id: PlanId
  name: string
  reviewLimitPerImport: number | null
  priceMonthly: number
}>

export function getReviewLimitForPlan(plan: PlanId) {
  return PLANS[plan].reviewLimitPerImport
}

export function isPremiumPlan(plan: PlanId) {
  return plan === "premium"
}
