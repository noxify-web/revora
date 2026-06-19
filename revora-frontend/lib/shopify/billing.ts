import type { Session } from "@shopify/shopify-api"

import { PLANS } from "@/lib/plans"
import { getAppBaseUrl } from "@/lib/extension/app-url"
import { setShopPlan } from "@/lib/shopify/plan-store"
import { getShopify } from "@/lib/shopify/shopify"

const PREMIUM_PLAN = PLANS.premium

export async function createPremiumSubscription(session: Session, returnPath = "/") {
  const shopify = getShopify()
  const admin = new shopify.clients.Graphql({ session })
  const appUrl = await getAppBaseUrl()
  const returnUrl = `${appUrl}/api/billing/confirm?shop=${encodeURIComponent(session.shop)}&return=${encodeURIComponent(returnPath)}`

  const response = await admin.request(`#graphql
    mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
        appSubscription { id status }
        confirmationUrl
        userErrors { field message }
      }
    }
  `, {
    variables: {
      name: "Revora Premium",
      returnUrl,
      test: process.env.NODE_ENV !== "production",
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: PREMIUM_PLAN.priceMonthly,
                currencyCode: "USD",
              },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ],
    },
  })

  const data = response.data as {
    appSubscriptionCreate?: {
      confirmationUrl?: string | null
      appSubscription?: { id?: string | null }
      userErrors?: { message: string }[]
    }
  }

  const payload = data.appSubscriptionCreate
  const error = payload?.userErrors?.[0]?.message

  if (error || !payload?.confirmationUrl) {
    throw new Error(error || "Failed to create subscription")
  }

  return {
    confirmationUrl: payload.confirmationUrl,
    subscriptionId: payload.appSubscription?.id ?? null,
  }
}

export async function confirmPremiumSubscription(session: Session) {
  const shopify = getShopify()
  const admin = new shopify.clients.Graphql({ session })

  const response = await admin.request(`#graphql
    query ActiveSubscriptions {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
        }
      }
    }
  `)

  const subscriptions = (
    response.data as {
      currentAppInstallation?: {
        activeSubscriptions?: { id: string; status: string }[]
      }
    }
  )?.currentAppInstallation?.activeSubscriptions ?? []

  const active = subscriptions.find((item) => item.status === "ACTIVE")

  if (!active) {
    return { activated: false as const }
  }

  await setShopPlan(session.shop, "premium", active.id)

  return {
    activated: true as const,
    subscriptionId: active.id,
  }
}

export async function getBillingStatus(session: Session) {
  const shopify = getShopify()
  const admin = new shopify.clients.Graphql({ session })

  const response = await admin.request(`#graphql
    query BillingStatus {
      currentAppInstallation {
        activeSubscriptions {
          id
          status
          name
        }
      }
    }
  `)

  const subscriptions = (
    response.data as {
      currentAppInstallation?: {
        activeSubscriptions?: { id: string; status: string; name: string }[]
      }
    }
  )?.currentAppInstallation?.activeSubscriptions ?? []

  const active = subscriptions.find((item) => item.status === "ACTIVE")

  return {
    hasActiveSubscription: Boolean(active),
    subscriptionId: active?.id ?? null,
  }
}
