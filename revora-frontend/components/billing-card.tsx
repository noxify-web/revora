"use client"

import { useCallback, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Plan</CardTitle>
            <CardDescription>
              Free imports up to 100 reviews per product. Premium is unlimited.
            </CardDescription>
          </div>
          {status ? (
            <Badge variant={status.plan === "premium" ? "default" : "secondary"}>
              {status.planName}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading plan...</p>
        ) : status ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium">Free</p>
                <p className="mt-1 text-2xl font-semibold">$0</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Up to 100 reviews per import
                </p>
              </div>
              <div className="rounded-lg border border-[#FFD8B8] bg-[#FFF4EB] p-4">
                <p className="text-sm font-medium text-[#E56B00]">Premium</p>
                <p className="mt-1 text-2xl font-semibold text-[#FB7701]">
                  ${status.premiumPrice}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlimited reviews per import
                </p>
              </div>
            </div>

            {status.plan === "free" ? (
              <Button onClick={() => void upgrade()} disabled={upgrading}>
                {upgrading ? "Opening checkout..." : "Upgrade to Premium"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Premium is active on this store.
              </p>
            )}
          </>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Billing error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
