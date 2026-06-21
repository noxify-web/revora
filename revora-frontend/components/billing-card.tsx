"use client"

import { useCallback, useEffect, useState } from "react"

import { adminFetch } from "@/lib/admin-fetch"

type BillingStatus = {
  plan: "free" | "premium"
  planName: string
  reviewLimit: number | null
  premiumPrice: number
  hasActiveSubscription: boolean
}

export function BillingCard() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminFetch("/api/billing/status")
      if (!response.ok) {
        throw new Error("Failed to load billing status")
      }
      setStatus(await response.json())
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load billing",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function upgrade() {
    setUpgrading(true)
    setError(null)

    try {
      const response = await adminFetch("/api/billing/subscribe", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to start upgrade")
      }

      const data = await response.json()
      if (data.confirmationUrl) {
        window.open(data.confirmationUrl, "_top")
      }
    } catch (upgradeError) {
      setError(
        upgradeError instanceof Error ? upgradeError.message : "Upgrade failed",
      )
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <s-stack gap="base">
      <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="start">
        <s-paragraph color="subdued">
          Free imports up to 100 reviews per product. Premium is unlimited.
        </s-paragraph>
        {status ? (
          <s-badge tone={status.plan === "premium" ? "success" : "info"}>
            {status.planName}
          </s-badge>
        ) : null}
      </s-grid>

      {loading ? (
        <s-paragraph color="subdued">Loading plan...</s-paragraph>
      ) : status ? (
        <s-stack gap="base">
          <s-grid
            gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
            gap="base"
          >
            <s-box padding="base" border="base" borderRadius="base">
              <s-stack gap="small">
                <s-text type="strong">Free</s-text>
                <s-heading>$0</s-heading>
                <s-paragraph color="subdued">
                  Up to 100 reviews per import
                </s-paragraph>
              </s-stack>
            </s-box>
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack gap="small">
                <s-text type="strong">Premium</s-text>
                <s-heading>
                  ${status.premiumPrice}
                  <s-text color="subdued">/mo</s-text>
                </s-heading>
                <s-paragraph color="subdued">
                  Unlimited reviews per import
                </s-paragraph>
              </s-stack>
            </s-box>
          </s-grid>

          {status.plan === "free" ? (
            <s-button
              variant="primary"
              onClick={() => void upgrade()}
              loading={upgrading}
            >
              Upgrade to Premium
            </s-button>
          ) : (
            <s-paragraph color="subdued">
              Premium is active on this store.
            </s-paragraph>
          )}
        </s-stack>
      ) : null}

      {error ? (
        <s-banner heading="Billing error" tone="critical">
          {error}
        </s-banner>
      ) : null}
    </s-stack>
  )
}