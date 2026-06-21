export type PlanId = "free"

export const REVORA_PLAN = {
  id: "free" as const,
  name: "Free",
  reviewLimitPerImport: null as number | null,
}

export function getReviewLimitForPlan() {
  return REVORA_PLAN.reviewLimitPerImport
}