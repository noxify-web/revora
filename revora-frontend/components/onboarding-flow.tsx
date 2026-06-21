"use client"

import { useCallback, useEffect, useState } from "react"

import { ConnectExtension } from "@/components/connect-extension"
import {
  ExtensionInstallActions,
  OnboardingActions,
  OnboardingCalloutImage,
  OnboardingInstallDemoGif,
  OnboardingJourneyList,
  OnboardingProgress,
  useExtensionInstallAck,
} from "@/components/onboarding-shared"
import {
  completeOnboardingFlow,
  consumeFlowRestarted,
  ONBOARDING_FLOW_STEPS,
  readOnboardingFlowStep,
  skipOnboardingFlow,
  writeOnboardingFlowStep,
  type OnboardingFlowStepId,
} from "@/lib/onboarding"

const CONNECT_SUCCESS_DELAY_MS = 3000

type OnboardingFlowProps = {
  hasConnectedExtension: boolean
  onComplete: () => void
  onExtensionStatusChange?: () => void
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
}

function OnboardingFlowHeader({
  stepIndex,
  totalSteps,
  title,
  summary,
}: OnboardingFlowHeaderProps) {
  return (
    <s-stack gap="small-200" paddingBlockEnd="small-200">
      <OnboardingProgress current={stepIndex + 1} total={totalSteps} />
      <s-heading>{title}</s-heading>
      {summary ? <s-paragraph color="subdued">{summary}</s-paragraph> : null}
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
  const [suppressAutoComplete, setSuppressAutoComplete] = useState(false)
  const [connectCelebration, setConnectCelebration] = useState(false)
  const { acknowledgeExtensionInstall } = useExtensionInstallAck()

  const goToStep = useCallback((nextStep: OnboardingFlowStepId) => {
    setStep(nextStep)
    writeOnboardingFlowStep(nextStep)
  }, [])

  useEffect(() => {
    const nextStep = readOnboardingFlowStep()
    const restarted = consumeFlowRestarted()

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate flow step from storage on mount
    setStep(nextStep)
    setSuppressAutoComplete(restarted)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (
      !hydrated ||
      !hasConnectedExtension ||
      suppressAutoComplete ||
      connectCelebration
    ) {
      return
    }

    completeOnboardingFlow()
    onComplete()
  }, [
    hydrated,
    hasConnectedExtension,
    suppressAutoComplete,
    connectCelebration,
    onComplete,
  ])

  useEffect(() => {
    if (!connectCelebration) {
      return
    }

    const timer = window.setTimeout(() => {
      completeOnboardingFlow()
      onComplete()
    }, CONNECT_SUCCESS_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [connectCelebration, onComplete])

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
    setConnectCelebration(true)
  }

  if (!hydrated) {
    return (
      <s-page inlineSize="small">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-spinner accessibilityLabel="Loading onboarding" />
          <s-text color="subdued">Loading...</s-text>
        </s-stack>
      </s-page>
    )
  }

  const stepIndex = getStepIndex(step)
  const stepMeta = ONBOARDING_FLOW_STEPS[stepIndex]
  const showBack = Boolean(getPreviousStep(step))

  return (
    <s-page inlineSize="small">
      <s-stack gap="small-200">
        <OnboardingFlowHeader
          stepIndex={stepIndex}
          totalSteps={ONBOARDING_FLOW_STEPS.length}
          title={
            connectCelebration && step === "connect"
              ? "You're connected"
              : stepMeta.title
          }
          summary={
            connectCelebration && step === "connect"
              ? "Your Chrome extension is linked to this store."
              : stepMeta.summary
          }
        />

        <s-section accessibilityLabel="Revora onboarding step content">
          {step === "welcome" ? <WelcomeStep /> : null}
          {step === "install" ? <InstallStepContent /> : null}
          {step === "connect" && connectCelebration ? (
            <ConnectSuccessStep />
          ) : null}
          {step === "connect" && !connectCelebration ? (
            <ConnectStepContent
              onConnected={handleConnected}
              onExtensionStatusChange={onExtensionStatusChange}
            />
          ) : null}
        </s-section>

        {step === "welcome" ? (
          <OnboardingActions
            compact
            tertiary={
              <s-button variant="tertiary" onClick={handleSkip}>
                Skip onboarding
              </s-button>
            }
            primary={
              <s-button
                variant="primary"
                icon="arrow-right"
                onClick={handleWelcomeContinue}
              >
                Continue
              </s-button>
            }
          />
        ) : null}

        {step === "install" ? (
          <OnboardingActions
            compact
            tertiary={
              showBack ? (
                <s-button variant="tertiary" onClick={handleBack}>
                  Back
                </s-button>
              ) : null
            }
            primary={
              <ExtensionInstallActions
                installComplete={false}
                onAcknowledgeInstall={acknowledgeExtensionInstall}
                onInstalledClick={handleInstallContinue}
              />
            }
          />
        ) : null}

        {step === "connect" && !connectCelebration ? (
          <OnboardingActions
            compact
            tertiary={
              <s-stack direction="inline" gap="small" alignItems="center">
                {showBack ? (
                  <s-button variant="tertiary" onClick={handleBack}>
                    Back
                  </s-button>
                ) : null}
                <s-button variant="tertiary" onClick={handleSkip}>
                  Skip onboarding
                </s-button>
              </s-stack>
            }
          />
        ) : null}
      </s-stack>
    </s-page>
  )
}

function WelcomeStep() {
  return (
    <s-grid gridTemplateColumns="auto 1fr" gap="small" alignItems="start">
      <OnboardingCalloutImage size="compact" alt="Revora onboarding illustration" />
      <OnboardingJourneyList />
    </s-grid>
  )
}

function InstallStepContent() {
  return (
    <s-grid gridTemplateColumns="3fr 2fr" gap="small" alignItems="start">
      <OnboardingInstallDemoGif variant="split" />
      <s-banner heading="Extension required" tone="info">
        <s-paragraph>
          The extension is required for Revora to import reviews from Temu.
        </s-paragraph>
      </s-banner>
    </s-grid>
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
    <ConnectExtension
      compact
      checkStatusOnMount={false}
      onConnected={() => {
        onExtensionStatusChange?.()
        onConnected()
      }}
    />
  )
}

function ConnectSuccessStep() {
  return (
    <s-banner tone="success">
      <s-stack gap="small-200">
        <s-heading>Extension connected</s-heading>
        <s-paragraph color="subdued">
          Opening your Revora dashboard…
        </s-paragraph>
      </s-stack>
    </s-banner>
  )
}