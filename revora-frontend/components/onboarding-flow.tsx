"use client"

import { useCallback, useEffect, useState } from "react"

import { ConnectExtension } from "@/components/connect-extension"
import {
  CHROME_WEB_STORE_URL,
  completeOnboardingFlow,
  ONBOARDING_FLOW_STEPS,
  ONBOARDING_STORAGE_KEYS,
  readOnboardingFlowStep,
  skipOnboardingFlow,
  writeOnboardingFlowStep,
  type OnboardingFlowStepId,
} from "@/lib/onboarding"

type OnboardingFlowProps = {
  hasConnectedExtension: boolean
  onComplete: () => void
  onExtensionStatusChange?: () => void
}

function openChromeWebStore() {
  window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer")
}

function acknowledgeExtensionInstall() {
  window.localStorage.setItem(
    ONBOARDING_STORAGE_KEYS.extensionInstallAck,
    "true",
  )
}

function getStepIndex(step: OnboardingFlowStepId) {
  return ONBOARDING_FLOW_STEPS.findIndex((item) => item.id === step)
}

function getPreviousStep(step: OnboardingFlowStepId): OnboardingFlowStepId | null {
  const index = getStepIndex(step)
  if (index <= 0) {
    return null
  }

  return ONBOARDING_FLOW_STEPS[index - 1]?.id ?? null
}

type OnboardingFlowHeaderProps = {
  stepIndex: number
  totalSteps: number
  title: string
  summary: string
  showBack: boolean
  onBack: () => void
}

function OnboardingFlowHeader({
  stepIndex,
  totalSteps,
  title,
  summary,
  showBack,
  onBack,
}: OnboardingFlowHeaderProps) {
  return (
    <s-grid
      gridTemplateColumns={showBack ? "auto 1fr" : "1fr"}
      gap="small"
      alignItems="start"
      paddingBlockEnd="base"
    >
      {showBack ? (
        <s-button
          variant="tertiary"
          icon="chevron-left"
          accessibilityLabel="Back"
          onClick={onBack}
        />
      ) : null}
      <s-stack gap="small-200">
        <s-text color="subdued">
          Step {stepIndex + 1} of {totalSteps}
        </s-text>
        <s-heading>{title}</s-heading>
        <s-paragraph color="subdued">{summary}</s-paragraph>
      </s-stack>
    </s-grid>
  )
}

export function OnboardingFlow({
  hasConnectedExtension,
  onComplete,
  onExtensionStatusChange,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingFlowStepId>("welcome")
  const [hydrated, setHydrated] = useState(false)

  const goToStep = useCallback((nextStep: OnboardingFlowStepId) => {
    setStep(nextStep)
    writeOnboardingFlowStep(nextStep)
  }, [])

  useEffect(() => {
    let nextStep = readOnboardingFlowStep()

    const installAcked =
      window.localStorage.getItem(
        ONBOARDING_STORAGE_KEYS.extensionInstallAck,
      ) === "true"

    if (installAcked && nextStep === "welcome") {
      nextStep = "connect"
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate flow step from storage on mount
    setStep(nextStep)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !hasConnectedExtension) {
      return
    }

    completeOnboardingFlow()
    onComplete()
  }, [hydrated, hasConnectedExtension, onComplete])

  function handleSkip() {
    skipOnboardingFlow()
    onComplete()
  }

  function handleBack() {
    const previousStep = getPreviousStep(step)
    if (previousStep) {
      goToStep(previousStep)
    }
  }

  function handleWelcomeContinue() {
    goToStep("install")
  }

  function handleInstallContinue() {
    acknowledgeExtensionInstall()
    goToStep("connect")
  }

  function handleConnected() {
    onExtensionStatusChange?.()
    completeOnboardingFlow()
    onComplete()
  }

  if (!hydrated) {
    return (
      <s-page heading="Welcome to Revora" inlineSize="small">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-spinner accessibilityLabel="Loading onboarding" />
          <s-text color="subdued">Loading...</s-text>
        </s-stack>
      </s-page>
    )
  }

  const stepIndex = getStepIndex(step)
  const stepMeta = ONBOARDING_FLOW_STEPS[stepIndex]
  const previousStep = getPreviousStep(step)

  return (
    <s-page heading="Welcome to Revora" inlineSize="small">
      <OnboardingFlowHeader
        stepIndex={stepIndex}
        totalSteps={ONBOARDING_FLOW_STEPS.length}
        title={stepMeta.title}
        summary={stepMeta.summary}
        showBack={Boolean(previousStep)}
        onBack={handleBack}
      />

      <s-section accessibilityLabel="Revora onboarding step content">
        {step === "welcome" ? <WelcomeStep /> : null}
        {step === "install" ? <InstallStepContent /> : null}
        {step === "connect" ? (
          <ConnectStepContent
            onConnected={handleConnected}
            onExtensionStatusChange={onExtensionStatusChange}
          />
        ) : null}
      </s-section>

      {step === "install" ? (
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
          gap="small"
          paddingBlockStart="base"
        >
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
            icon="check-circle"
            onClick={handleInstallContinue}
          >
            I&apos;ve installed it
          </s-button>
        </s-grid>
      ) : null}

      {step === "welcome" ? (
        <s-grid
          gridTemplateColumns="1fr auto"
          gap="base"
          alignItems="center"
          paddingBlockStart="base"
        >
          <s-button variant="tertiary" onClick={handleSkip}>
            Skip onboarding
          </s-button>
          <s-button
            variant="primary"
            icon="arrow-right"
            onClick={handleWelcomeContinue}
          >
            Continue
          </s-button>
        </s-grid>
      ) : step === "connect" ? (
        <s-box paddingBlockStart="base">
          <s-button variant="tertiary" onClick={handleSkip}>
            Skip onboarding
          </s-button>
        </s-box>
      ) : null}
    </s-page>
  )
}

function WelcomeStep() {
  return (
    <s-stack gap="large">
      <s-box
        border="base"
        borderRadius="base"
        overflow="hidden"
        background="subdued"
      >
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
          gap="base"
          padding="large"
          alignItems="center"
          justifyItems="center"
        >
          <s-box maxInlineSize="200px">
            <s-image
              src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
              alt="Revora onboarding illustration"
              aspectRatio="1/1"
            />
          </s-box>
        </s-grid>
      </s-box>

      <s-ordered-list>
        <s-list-item>Install the Revora Chrome extension</s-list-item>
        <s-list-item>Connect it to this Shopify store</s-list-item>
        <s-list-item>Import reviews from any Temu product page</s-list-item>
      </s-ordered-list>
    </s-stack>
  )
}

function InstallStepContent() {
  return (
    <s-stack gap="base">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-icon type="app-extension" size="small" />
        <s-heading>Why you need the Chrome extension</s-heading>
      </s-stack>
      <s-paragraph>
        Temu reviews live on Temu product pages. Revora&apos;s extension runs in
        Chrome, reads those reviews while you browse, and sends them securely to
        this Shopify store.
      </s-paragraph>
      <s-unordered-list>
        <s-list-item>Works on any Temu product listing you source</s-list-item>
        <s-list-item>Scrolls and captures reviews automatically</s-list-item>
        <s-list-item>Pairs with this admin app — no manual copy-paste</s-list-item>
      </s-unordered-list>
    </s-stack>
  )
}

type ConnectStepContentProps = {
  onConnected: () => void
  onExtensionStatusChange?: () => void
}

function ConnectStepContent({
  onConnected,
  onExtensionStatusChange,
}: ConnectStepContentProps) {
  return (
    <s-stack gap="base">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-icon type="connect" size="small" />
        <s-heading>Link extension to your store</s-heading>
      </s-stack>
      <s-paragraph>
        Keep this Revora admin tab open and click Connect. The extension pairs
        automatically — no codes to copy.
      </s-paragraph>
      <ConnectExtension
        onConnected={() => {
          onExtensionStatusChange?.()
          onConnected()
        }}
      />
    </s-stack>
  )
}