import { getReviewLimitForPlan, type PlanId, REVORA_PLAN } from "@/lib/plans";
import { ensureShopPlan } from "@/lib/shopify/plan-store";

export interface ResolvedShopPlan {
  plan: PlanId;
  planName: string;
  reviewLimit: number | null;
}

export async function resolveShopPlan(shop: string): Promise<ResolvedShopPlan> {
  await ensureShopPlan(shop);

  return {
    plan: REVORA_PLAN.id,
    planName: REVORA_PLAN.name,
    reviewLimit: getReviewLimitForPlan(),
  };
}
