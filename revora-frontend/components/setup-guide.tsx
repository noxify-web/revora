"use client"

import { useState } from "react"

import { ConnectExtension } from "@/components/connect-extension"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
  defaultOpen?: boolean
  content?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform",
        open && "rotate-180",
      )}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckIcon({ complete }: { complete: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
        complete
          ? "border-[#FB7701] bg-[#FFF4EB] text-[#FB7701]"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {complete ? (
        <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </span>
  )
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
      defaultOpen: true,
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
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Setup guide</CardTitle>
            <CardDescription>
              Follow these steps to import and display Temu reviews on your store.
            </CardDescription>
          </div>
          <p className="text-sm font-medium text-[#0d7a6f]">
            {completedTasks} of 3 tasks complete
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {steps.map((step) => {
          const isOpen = openStep === step.id

          return (
            <div
              key={step.id}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors",
                isOpen ? "border-[#FFD8B8] bg-[#FFFCFA]" : "border-border/70 bg-card",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
                onClick={() => setOpenStep(isOpen ? 0 : step.id)}
              >
                <CheckIcon complete={step.complete} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Step {step.id}. {step.title}
                    </p>
                    <ChevronIcon open={isOpen} />
                  </div>
                  {!isOpen ? (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  ) : null}
                </div>
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-[#FFD8B8]/60 px-4 py-4">
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.content}
                  {step.action ? (
                    <Button
                      size="sm"
                      className="bg-[#FB7701] text-white hover:bg-[#E56B00]"
                      onClick={step.action.onClick}
                    >
                      {step.action.label}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}