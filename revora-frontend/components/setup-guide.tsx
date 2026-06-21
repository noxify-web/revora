"use client"

import { useEffect, useState } from "react"

import { ConnectExtension } from "@/components/connect-extension"

const SETUP_GUIDE_DISMISSED_KEY = "revora-setup-guide-dismissed"

type SetupGuideProps = {
  hasConnectedExtension: boolean
  hasImportedReviews: boolean
  hasPublishedReviews: boolean
  onScrollToProducts: () => void
  onScrollToDisplay: () => void
  onExtensionStatusChange?: () => void
}

type StepKey = "step1" | "step2" | "step3"

export function SetupGuide({
  hasConnectedExtension,
  hasImportedReviews,
  hasPublishedReviews,
  onScrollToProducts,
  onScrollToDisplay,
  onExtensionStatusChange,
}: SetupGuideProps) {
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState({
    guide: true,
    step1: true,
    step2: false,
    step3: false,
  })

  useEffect(() => {
    setVisible(
      window.localStorage.getItem(SETUP_GUIDE_DISMISSED_KEY) !== "true",
    )
  }, [])

  const completedTasks =
    Number(hasConnectedExtension) +
    Number(hasImportedReviews) +
    Number(hasPublishedReviews)

  function dismissGuide() {
    setVisible(false)
    window.localStorage.setItem(SETUP_GUIDE_DISMISSED_KEY, "true")
  }

  function toggleStep(step: StepKey) {
    setExpanded((current) => ({ ...current, [step]: !current[step] }))
  }

  if (!visible) {
    return null
  }

  return (
    <s-section>
      <s-grid gap="base">
        <s-grid gap="small-200">
          <s-grid
            gridTemplateColumns="1fr auto auto"
            gap="small-300"
            alignItems="center"
          >
            <s-heading>Setup guide</s-heading>
            <s-button
              accessibilityLabel="Dismiss guide"
              variant="tertiary"
              tone="neutral"
              icon="x"
              onClick={dismissGuide}
            />
            <s-button
              accessibilityLabel="Toggle setup guide"
              variant="tertiary"
              tone="neutral"
              icon={expanded.guide ? "chevron-up" : "chevron-down"}
              onClick={() =>
                setExpanded((current) => ({
                  ...current,
                  guide: !current.guide,
                }))
              }
            />
          </s-grid>
          <s-paragraph>
            Follow these steps to import and display Temu reviews on your store.
          </s-paragraph>
          <s-paragraph color="subdued">
            {completedTasks} out of 3 steps completed
          </s-paragraph>
        </s-grid>

        <s-box
          borderRadius="base"
          border="base"
          background="base"
          display={expanded.guide ? "auto" : "none"}
        >
          <s-box>
            <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
              <s-checkbox
                label="Connect the Chrome extension"
                checked={hasConnectedExtension}
                disabled
              />
              <s-button
                accessibilityLabel="Toggle step 1 details"
                variant="tertiary"
                icon={expanded.step1 ? "chevron-up" : "chevron-down"}
                onClick={() => toggleStep("step1")}
              />
            </s-grid>
            <s-box
              padding="small"
              paddingBlockStart="none"
              display={expanded.step1 ? "auto" : "none"}
            >
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack gap="base">
                  <s-paragraph>
                    Connect the Revora Chrome extension while this admin page is
                    open, then import Temu reviews into your Shopify products.
                  </s-paragraph>
                  <ConnectExtension onConnected={onExtensionStatusChange} />
                  <s-button variant="primary" onClick={onScrollToProducts}>
                    View products
                  </s-button>
                </s-stack>
              </s-box>
            </s-box>
          </s-box>

          <s-divider />

          <s-box>
            <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
              <s-checkbox
                label="Import and publish reviews"
                checked={hasImportedReviews}
                disabled
              />
              <s-button
                accessibilityLabel="Toggle step 2 details"
                variant="tertiary"
                icon={expanded.step2 ? "chevron-up" : "chevron-down"}
                onClick={() => toggleStep("step2")}
              />
            </s-grid>
            <s-box
              padding="small"
              paddingBlockStart="none"
              display={expanded.step2 ? "auto" : "none"}
            >
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack gap="base">
                  <s-paragraph>
                    Review imported content in the product table below and publish
                    reviews to mapped products.
                  </s-paragraph>
                  <s-button variant="primary" onClick={onScrollToProducts}>
                    Manage products
                  </s-button>
                </s-stack>
              </s-box>
            </s-box>
          </s-box>

          <s-divider />

          <s-box>
            <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
              <s-checkbox
                label="Display reviews on your storefront"
                checked={hasPublishedReviews}
                disabled
              />
              <s-button
                accessibilityLabel="Toggle step 3 details"
                variant="tertiary"
                icon={expanded.step3 ? "chevron-up" : "chevron-down"}
                onClick={() => toggleStep("step3")}
              />
            </s-grid>
            <s-box
              padding="small"
              paddingBlockStart="none"
              display={expanded.step3 ? "auto" : "none"}
            >
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack gap="base">
                  <s-paragraph>
                    Enable the Revora Reviews widget in your theme editor so
                    shoppers can see imported reviews on product pages.
                  </s-paragraph>
                  <s-button variant="primary" onClick={onScrollToDisplay}>
                    Set up widget
                  </s-button>
                </s-stack>
              </s-box>
            </s-box>
          </s-box>
        </s-box>
      </s-grid>
    </s-section>
  )
}