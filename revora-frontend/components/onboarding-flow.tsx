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

type OnboardingStepDotsProps = {
  currentIndex: number
  total: number
}

function OnboardingStepDots({ currentIndex, total }: OnboardingStepDotsProps) {
  return (
    <s-stack
      direction="inline"
      gap="small-200"
      alignItems="center"
      justifyContent="center"
      paddingBlockStart="base"
    >
      {Array.from({ length: total }, (_, index) => {
        const active = index === currentIndex

        return (
          <s-box
            key={ONBOARDING_FLOW_STEPS[index]?.id ?? index}
            borderRadius="large-200"
            background={active ? "strong" : "subdued"}
            inlineSize={active ? "20px" : "8px"}
            blockSize="8px"
            accessibilityLabel={`Step ${index + 1} of ${total}${active ? ", current step" : ""}`}
          />
        )
      })}
    </s-stack>
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
        <s-section>
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-spinner accessibilityLabel="Loading onboarding" />
            <s-text color="subdued">Loading...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    )
  }

  const stepIndex = getStepIndex(step)
  const stepMeta = ONBOARDING_FLOW_STEPS[stepIndex]
  const previousStep = getPreviousStep(step)

  return (
    <s-page heading="Welcome to Revora" inlineSize="small">
      <s-section accessibilityLabel="Revora onboarding">
        <s-stack gap="large">
          <s-grid
            gridTemplateColumns={previousStep ? "auto 1fr" : "1fr"}
            gap="small"
            alignItems="start"
          >
            {previousStep ? (
              <s-button
                variant="tertiary"
                icon="chevron-left"
                accessibilityLabel="Back"
                onClick={handleBack}
              />
            ) : null}
            <s-stack gap="small-200">
              <s-heading>{stepMeta.title}</s-heading>
              <s-paragraph color="subdued">{stepMeta.summary}</s-paragraph>
            </s-stack>
          </s-grid>

          {step === "welcome" ? <WelcomeStep /> : null}

          {step === "install" ? (
            <InstallStep onContinue={handleInstallContinue} />
          ) : null}

          {step === "connect" ? (
            <ConnectStep
              onConnected={handleConnected}
              onExtensionStatusChange={onExtensionStatusChange}
            />
          ) : null}

          {step === "welcome" ? (
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
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
          ) : (
            <s-button variant="tertiary" onClick={handleSkip}>
              Skip onboarding
            </s-button>
          )}

          <OnboardingStepDots
            currentIndex={stepIndex}
            total={ONBOARDING_FLOW_STEPS.length}
          />
        </s-stack>
      </s-section>
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

type InstallStepProps = {
  onContinue: () => void
}

function InstallStep({ onContinue }: InstallStepProps) {
  return (
    <s-stack gap="base">
      <s-box padding="large" background="subdued" borderRadius="base">
        <s-stack gap="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-icon type="app-extension" size="small" />
            <s-heading>Why you need the Chrome extension</s-heading>
          </s-stack>
          <s-paragraph>
            Temu reviews live on Temu product pages. Revora&apos;s extension
            runs in Chrome, reads those reviews while you browse, and sends them
            securely to this Shopify store.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>Works on any Temu product listing you source</s-list-item>
            <s-list-item>
              Scrolls and captures reviews automatically
            </s-list-item>
            <s-list-item>
              Pairs with this admin app — no manual copy-paste
            </s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-box>

      <s-grid
        gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
        gap="small"
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
        <s-button variant="secondary" icon="check-circle" onClick={onContinue}>
          I&apos;ve installed it
        </s-button>
      </s-grid>
    </s-stack>
  )
}

type ConnectStepProps = {
  onConnected: () => void
  onExtensionStatusChange?: () => void
}

function ConnectStep({
  onConnected,
  onExtensionStatusChange,
}: ConnectStepProps) {
  return (
    <s-box padding="large" background="subdued" borderRadius="base">
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
    </s-box>
  )
}