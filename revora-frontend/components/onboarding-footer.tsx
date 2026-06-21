"use client"

import { reopenOnboardingGuide } from "@/components/onboarding-guide"

export function OnboardingFooter() {
  return (
    <s-stack alignItems="center" paddingBlock="large" gap="small">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-text color="subdued">Need help getting started?</s-text>
        <s-button
          variant="tertiary"
          onClick={() => {
            reopenOnboardingGuide()
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        >
          Reopen setup guide
        </s-button>
        <s-text color="subdued">·</s-text>
        <s-link
          href="https://help.shopify.com/manual/online-store/themes/theme-structure/extend/apps"
          target="_blank"
        >
          Theme app embeds
        </s-link>
      </s-stack>
      <s-text color="subdued">
        Revora is not affiliated with Temu or Shopify. You are responsible for
        how imported reviews are displayed on your store.
      </s-text>
    </s-stack>
  )
}