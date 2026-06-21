"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { ConnectExtension } from "@/components/connect-extension"
import { OnboardingVideo } from "@/components/onboarding-video"
import {
  CHROME_WEB_STORE_URL,
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEYS,
  type OnboardingStepId,
} from "@/lib/onboarding"

type OnboardingGuideProps = {
  hasConnectedExtension: boolean
  hasImportedReviews: boolean
  hasPublishedReviews: boolean
  onScrollToProducts: () => void
  onScrollToDisplay: () => void
  onExtensionStatusChange?: () => void
}

type ExpandedSteps = Record<OnboardingStepId, boolean> & { guide: boolean }

function getInitialExpanded(): ExpandedSteps {
  return {
    guide: true,
    install: true,
    connect: false,
    import: false,
    publish: false,
  }
}

function openChromeWebStore() {
  window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer")
}

export function OnboardingGuide({
  hasConnectedExtension,
  hasImportedReviews,
  hasPublishedReviews,
  onScrollToProducts,
  onScrollToDisplay,
  onExtensionStatusChange,
}: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState<ExpandedSteps>(getInitialExpanded)
  const [installAcked, setInstallAcked] = useState(false)

  useEffect(() => {
    function syncFromStorage() {
      setVisible(
        window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.dismissed) !==
          "true",
      )
      setInstallAcked(
        window.localStorage.getItem(
          ONBOARDING_STORAGE_KEYS.extensionInstallAck,
        ) === "true",
      )
    }

    syncFromStorage()
    window.addEventListener("revora:reopen-onboarding", syncFromStorage)
    return () =>
      window.removeEventListener("revora:reopen-onboarding", syncFromStorage)
  }, [])

  const stepCompletion = useMemo(
    () => ({
      install: installAcked || hasConnectedExtension,
      connect: hasConnectedExtension,
      import: hasImportedReviews,
      publish: hasPublishedReviews,
    }),
    [
      installAcked,
      hasConnectedExtension,
      hasImportedReviews,
      hasPublishedReviews,
    ],
  )

  const completedCount = ONBOARDING_STEPS.filter(
    (step) => stepCompletion[step.id],
  ).length

  const allComplete = completedCount === ONBOARDING_STEPS.length
  const progressPercent = Math.round(
    (completedCount / ONBOARDING_STEPS.length) * 100,
  )

  const focusNextIncompleteStep = useCallback(() => {
    const nextStep = ONBOARDING_STEPS.find(
      (step) => !stepCompletion[step.id],
    )?.id

    if (!nextStep) {
      return
    }

    setExpanded((current) => ({
      ...current,
      guide: true,
      install: nextStep === "install",
      connect: nextStep === "connect",
      import: nextStep === "import",
      publish: nextStep === "publish",
    }))
  }, [stepCompletion])

  const prevCompletedCountRef = useRef(completedCount)
  const wasVisibleRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false
      return
    }

    const becameVisible = !wasVisibleRef.current
    const stepCompleted = completedCount > prevCompletedCountRef.current

    wasVisibleRef.current = true
    prevCompletedCountRef.current = completedCount

    if (becameVisible || stepCompleted) {
      focusNextIncompleteStep()
    }
  }, [visible, completedCount, focusNextIncompleteStep])

  function dismissGuide() {
    setVisible(false)
    window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.dismissed, "true")
    window.dispatchEvent(new CustomEvent("revora:onboarding-dismissed"))
  }

  function acknowledgeExtensionInstall() {
    setInstallAcked(true)
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEYS.extensionInstallAck,
      "true",
    )
  }

  function toggleStep(step: OnboardingStepId) {
    setExpanded((current) => ({ ...current, [step]: !current[step] }))
  }

  if (!visible) {
    return null
  }

  return (
    <s-section heading="Get started with Revora">
      <s-stack gap="base">
        <s-banner heading="Import Temu reviews in minutes" tone="info">
          <s-paragraph>
            Revora copies live Temu product reviews — text, ratings, and photos
            — onto your Shopify products. Complete the steps below to see
            reviews on your storefront.
          </s-paragraph>
        </s-banner>

        {allComplete ? (
          <s-banner heading="You're all set!" tone="success">
            <s-stack gap="small">
              <s-paragraph>
                Your store is connected, reviews are imported, and your
                storefront is ready. You can dismiss this guide or keep it for
                reference.
              </s-paragraph>
              <s-button variant="primary" onClick={dismissGuide}>
                Dismiss setup guide
              </s-button>
            </s-stack>
          </s-banner>
        ) : null}

        <s-grid
          gridTemplateColumns="1fr auto auto"
          gap="small-300"
          alignItems="center"
        >
          <s-stack gap="small-200">
            <s-paragraph>
              <s-text type="strong">
                {completedCount} of {ONBOARDING_STEPS.length} steps complete
              </s-text>
              {" · "}
              {progressPercent}% done
            </s-paragraph>
            <div
              style={{
                blockSize: "8px",
                borderRadius: "var(--p-border-radius-200, 8px)",
                background: "var(--p-color-bg-surface-secondary, #f1f1f1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  blockSize: "100%",
                  inlineSize: `${progressPercent}%`,
                  background: "var(--p-color-bg-fill-brand, #fb7701)",
                  transition: "inline-size 0.2s ease",
                }}
              />
            </div>
          </s-stack>
          <s-button
            accessibilityLabel="Dismiss setup guide"
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

        <s-box display={expanded.guide ? "auto" : "none"}>
          <s-grid
            gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))"
            gap="base"
            alignItems="start"
          >
            <OnboardingVideo onOpenChromeStore={acknowledgeExtensionInstall} />

            <s-box
              border="base"
              borderRadius="base"
              background="base"
              padding="base"
            >
              <s-stack gap="base">
                <s-heading>Your path to the aha moment</s-heading>
                <s-paragraph color="subdued">
                  The goal: shoppers see real Temu reviews on your product
                  pages. Most merchants finish in under 10 minutes.
                </s-paragraph>
                <s-ordered-list>
                  <s-list-item>Install Revora from the Chrome Web Store</s-list-item>
                  <s-list-item>Connect while this Shopify admin tab is open</s-list-item>
                  <s-list-item>
                    Import from any Temu product page in Chrome
                  </s-list-item>
                  <s-list-item>
                    Publish and turn on the Revora Reviews widget
                  </s-list-item>
                </s-ordered-list>
                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="primary"
                    icon="external"
                    onClick={() => {
                      acknowledgeExtensionInstall()
                      openChromeWebStore()
                    }}
                  >
                    Get Chrome extension
                  </s-button>
                  <s-button variant="secondary" onClick={focusNextIncompleteStep}>
                    Continue setup
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          </s-grid>

          <s-box paddingBlockStart="base">
            <s-box borderRadius="base" border="base" background="base">
              <OnboardingStep
                stepId="install"
                title={ONBOARDING_STEPS[0].title}
                summary={ONBOARDING_STEPS[0].summary}
                complete={stepCompletion.install}
                expanded={expanded.install}
                onToggle={() => toggleStep("install")}
              >
                <s-stack gap="base">
                  <s-paragraph>
                    Revora runs as a Chrome extension on Temu. Install it once,
                    then use it on any Temu product page you source from.
                  </s-paragraph>
                  <s-stack direction="inline" gap="small">
                    <s-button
                      variant="primary"
                      icon="external"
                      onClick={() => {
                        acknowledgeExtensionInstall()
                        openChromeWebStore()
                      }}
                    >
                      Add to Chrome
                    </s-button>
                    <s-button
                      variant="secondary"
                      onClick={acknowledgeExtensionInstall}
                      disabled={stepCompletion.install}
                    >
                      {stepCompletion.install
                        ? "Extension ready"
                        : "I've installed it"}
                    </s-button>
                  </s-stack>
                  <s-paragraph color="subdued">
                    After installing, pin Revora in Chrome&apos;s toolbar for
                    quick access. Return here for step 2.
                  </s-paragraph>
                </s-stack>
              </OnboardingStep>

              <s-divider />

              <OnboardingStep
                stepId="connect"
                title={ONBOARDING_STEPS[1].title}
                summary={ONBOARDING_STEPS[1].summary}
                complete={stepCompletion.connect}
                expanded={expanded.connect}
                onToggle={() => toggleStep("connect")}
              >
                <s-stack gap="base">
                  <s-paragraph>
                    Click Connect below while this Revora admin page stays open.
                    The extension pairs automatically — no codes or copy-paste.
                  </s-paragraph>
                  <ConnectExtension onConnected={onExtensionStatusChange} />
                </s-stack>
              </OnboardingStep>

              <s-divider />

              <OnboardingStep
                stepId="import"
                title={ONBOARDING_STEPS[2].title}
                summary={ONBOARDING_STEPS[2].summary}
                complete={stepCompletion.import}
                expanded={expanded.import}
                onToggle={() => toggleStep("import")}
              >
                <s-stack gap="base">
                  <s-ordered-list>
                    <s-list-item>
                      Open a Temu product page in Chrome (same browser as the
                      extension)
                    </s-list-item>
                    <s-list-item>
                      Click the Revora panel, choose a Shopify product, and
                      pick a review filter
                    </s-list-item>
                    <s-list-item>
                      Click Import reviews — Revora scrolls and uploads
                      automatically
                    </s-list-item>
                  </s-ordered-list>
                  <s-button variant="primary" onClick={onScrollToProducts}>
                    View imported products
                  </s-button>
                </s-stack>
              </OnboardingStep>

              <s-divider />

              <OnboardingStep
                stepId="publish"
                title={ONBOARDING_STEPS[3].title}
                summary={ONBOARDING_STEPS[3].summary}
                complete={stepCompletion.publish}
                expanded={expanded.publish}
                onToggle={() => toggleStep("publish")}
              >
                <s-stack gap="base">
                  <s-paragraph>
                    Publish makes reviews live for your store. Then enable the
                    Revora Reviews app block so shoppers see them on product
                    pages.
                  </s-paragraph>
                  <s-stack direction="inline" gap="small">
                    <s-button variant="primary" onClick={onScrollToProducts}>
                      Publish reviews
                    </s-button>
                    <s-button variant="secondary" onClick={onScrollToDisplay}>
                      Set up storefront widget
                    </s-button>
                  </s-stack>
                </s-stack>
              </OnboardingStep>
            </s-box>
          </s-box>
        </s-box>
      </s-stack>
    </s-section>
  )
}

type OnboardingStepProps = {
  stepId: OnboardingStepId
  title: string
  summary: string
  complete: boolean
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

function OnboardingStep({
  title,
  summary,
  complete,
  expanded,
  onToggle,
  children,
}: OnboardingStepProps) {
  return (
    <s-box>
      <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
        <s-stack gap="small-200">
          <s-grid
            gridTemplateColumns="1fr auto"
            gap="small"
            alignItems="center"
          >
            <s-checkbox label={title} checked={complete} disabled />
            {complete ? (
              <s-badge tone="success" icon="check-circle">
                Done
              </s-badge>
            ) : null}
          </s-grid>
          <s-paragraph color="subdued">{summary}</s-paragraph>
        </s-stack>
        <s-button
          accessibilityLabel={`Toggle ${title} details`}
          variant="tertiary"
          icon={expanded ? "chevron-up" : "chevron-down"}
          onClick={onToggle}
        />
      </s-grid>
      <s-box
        padding="small"
        paddingBlockStart="none"
        display={expanded ? "auto" : "none"}
      >
        <s-box padding="base" background="subdued" borderRadius="base">
          {children}
        </s-box>
      </s-box>
    </s-box>
  )
}

export function reopenOnboardingGuide() {
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.dismissed)
  window.dispatchEvent(new CustomEvent("revora:reopen-onboarding"))
}