"use client"

import { useState } from "react"

import { ConnectExtension } from "@/components/connect-extension"

type SetupGuideProps = {
  completedTasks: number
  hasImportedReviews: boolean
  hasPublishedReviews: boolean
  onScrollToProducts: () => void
  onScrollToDisplay: () => void
}

type StepConfig = {
  id: number
  title: string
  description: string
  complete: boolean
  content?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function SetupGuide({
  completedTasks,
  hasImportedReviews,
  hasPublishedReviews,
  onScrollToProducts,
  onScrollToDisplay,
}: SetupGuideProps) {
  const [openStep, setOpenStep] = useState(1)

  const steps: StepConfig[] = [
    {
      id: 1,
      title: "Import reviews",
      description:
        "Connect the Chrome extension and import Temu reviews into your Shopify products.",
      complete: true,
      content: <ConnectExtension />,
      action: {
        label: "Get started",
        onClick: onScrollToProducts,
      },
    },
    {
      id: 2,
      title: "Manage reviews",
      description:
        "Review imported content and publish reviews to your mapped products.",
      complete: hasImportedReviews,
      action: hasImportedReviews
        ? {
            label: "View products",
            onClick: onScrollToProducts,
          }
        : undefined,
    },
    {
      id: 3,
      title: "Display reviews on storefront",
      description:
        "Enable the Revora Reviews widget in your theme editor so shoppers can see reviews.",
      complete: hasPublishedReviews,
      action: {
        label: "Set up widget",
        onClick: onScrollToDisplay,
      },
    },
  ]

  return (
    <s-section>
      <s-stack gap="base">
        <s-grid
          gridTemplateColumns="1fr auto"
          gap="small"
          alignItems="start"
        >
          <s-stack gap="small-200">
            <s-heading>Setup guide</s-heading>
            <s-paragraph color="subdued">
              Follow these steps to import and display Temu reviews on your store.
            </s-paragraph>
          </s-stack>
          <s-text type="strong" tone="success">
            {completedTasks} of 3 tasks complete
          </s-text>
        </s-grid>

        <s-stack gap="small">
          {steps.map((step) => {
            const isOpen = openStep === step.id

            return (
              <s-box
                key={step.id}
                padding="none"
                border="base"
                borderRadius="base"
                background={isOpen ? "subdued" : "base"}
              >
                <s-clickable
                  padding="base"
                  onClick={() => setOpenStep(isOpen ? 0 : step.id)}
                >
                  <s-grid
                    gridTemplateColumns="auto 1fr auto"
                    gap="small"
                    alignItems="start"
                  >
                    <s-icon
                      type={step.complete ? "check-circle" : "circle-dashed"}
                      tone={step.complete ? "success" : "neutral"}
                    />
                    <s-stack gap="small-200">
                      <s-text type="strong">
                        Step {step.id}. {step.title}
                      </s-text>
                      {!isOpen ? (
                        <s-paragraph color="subdued">{step.description}</s-paragraph>
                      ) : null}
                    </s-stack>
                    <s-icon
                      type={isOpen ? "chevron-up" : "chevron-down"}
                      tone="neutral"
                    />
                  </s-grid>
                </s-clickable>

                {isOpen ? (
                  <s-box padding="base" paddingBlockStart="none">
                    <s-stack gap="base">
                      <s-paragraph color="subdued">{step.description}</s-paragraph>
                      {step.content}
                      {step.action ? (
                        <s-button
                          variant="primary"
                          onClick={step.action.onClick}
                        >
                          {step.action.label}
                        </s-button>
                      ) : null}
                    </s-stack>
                  </s-box>
                ) : null}
              </s-box>
            )
          })}
        </s-stack>
      </s-stack>
    </s-section>
  )
}