"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { ConnectExtension } from "@/components/connect-extension";
import {
  ExtensionInstallActions,
  OnboardingActions,
  OnboardingCalloutImage,
  OnboardingInstallDemoGif,
  OnboardingJourneyList,
  OnboardingProgress,
  useExtensionInstallAck,
} from "@/components/onboarding-shared";
import {
  ONBOARDING_FLOW_STEPS,
  type OnboardingFlowStepId,
  readOnboardingFlowStep,
  writeOnboardingFlowStep,
} from "@/lib/onboarding";
import {
  completeOnboardingFlow,
  consumeFlowRestarted,
  skipOnboardingFlow,
} from "@/lib/onboarding/store";

const CONNECT_SUCCESS_DELAY_MS = 3000;

interface OnboardingFlowProps {
  hasConnectedExtension: boolean;
  onExtensionStatusChange?: () => void;
}

function getStepIndex(step: OnboardingFlowStepId) {
  return ONBOARDING_FLOW_STEPS.findIndex((item) => item.id === step);
}

function getPreviousStep(
  step: OnboardingFlowStepId
): OnboardingFlowStepId | null {
  const index = getStepIndex(step);
  if (index <= 0) {
    return null;
  }

  return ONBOARDING_FLOW_STEPS[index - 1]?.id ?? null;
}

interface OnboardingFlowHeaderProps {
  stepIndex: number;
  summary: string;
  title: string;
  totalSteps: number;
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
  );
}

export function OnboardingFlow({
  hasConnectedExtension,
  onExtensionStatusChange,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingFlowStepId>("welcome");
  const [suppressAutoComplete, setSuppressAutoComplete] = useState(false);
  const [connectCelebration, setConnectCelebration] = useState(false);
  const { installAcked, acknowledgeExtensionInstall } =
    useExtensionInstallAck();

  const goToStep = useCallback((nextStep: OnboardingFlowStepId) => {
    setStep(nextStep);
    writeOnboardingFlowStep(nextStep);
  }, []);

  const finishFlow = useCallback((mode: "immediate" | "celebrate") => {
    if (mode === "celebrate") {
      setConnectCelebration(true);
      return;
    }

    completeOnboardingFlow();
  }, []);

  useLayoutEffect(() => {
    const restarted = consumeFlowRestarted();
    setStep(readOnboardingFlowStep());
    setSuppressAutoComplete(restarted);
  }, []);

  useEffect(() => {
    if (suppressAutoComplete || connectCelebration) {
      return;
    }

    if (!hasConnectedExtension) {
      return;
    }

    finishFlow("immediate");
  }, [
    hasConnectedExtension,
    suppressAutoComplete,
    connectCelebration,
    finishFlow,
  ]);

  useEffect(() => {
    if (!connectCelebration) {
      return;
    }

    const timer = window.setTimeout(() => {
      finishFlow("immediate");
    }, CONNECT_SUCCESS_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [connectCelebration, finishFlow]);

  function handleSkip() {
    skipOnboardingFlow();
  }

  function handleBack() {
    const previousStep = getPreviousStep(step);
    if (previousStep) {
      goToStep(previousStep);
    }
  }

  function handleWelcomeContinue() {
    goToStep("install");
  }

  function handleInstallContinue() {
    acknowledgeExtensionInstall();
    goToStep("connect");
  }

  function handleConnected() {
    onExtensionStatusChange?.();
    finishFlow("celebrate");
  }

  const stepIndex = getStepIndex(step);
  const stepMeta = ONBOARDING_FLOW_STEPS[stepIndex];
  const showBack = Boolean(getPreviousStep(step));

  return (
    <s-page inlineSize="small">
      <s-stack gap="small-200">
        <OnboardingFlowHeader
          stepIndex={stepIndex}
          summary={
            connectCelebration && step === "connect"
              ? "Your Chrome extension is linked to this store."
              : stepMeta.summary
          }
          title={
            connectCelebration && step === "connect"
              ? "You're connected"
              : stepMeta.title
          }
          totalSteps={ONBOARDING_FLOW_STEPS.length}
        />

        <s-section accessibilityLabel="Revora onboarding step content">
          {step === "welcome" ? <WelcomeStep /> : null}
          {step === "install" ? <InstallStepContent /> : null}
          {step === "connect" && connectCelebration ? (
            <ConnectSuccessStep />
          ) : null}
          {step === "connect" && !connectCelebration ? (
            <ConnectStepContent onConnected={handleConnected} />
          ) : null}
        </s-section>

        {step === "welcome" ? (
          <OnboardingActions
            compact
            primary={
              <s-button
                icon="arrow-right"
                onClick={handleWelcomeContinue}
                variant="primary"
              >
                Continue
              </s-button>
            }
            tertiary={
              <s-button onClick={handleSkip} variant="tertiary">
                Skip onboarding
              </s-button>
            }
          />
        ) : null}

        {step === "install" ? (
          <OnboardingActions
            compact
            primary={
              <ExtensionInstallActions
                installComplete={installAcked}
                onAcknowledgeInstall={acknowledgeExtensionInstall}
                onInstalledClick={handleInstallContinue}
              />
            }
            tertiary={
              showBack ? (
                <s-button onClick={handleBack} variant="tertiary">
                  Back
                </s-button>
              ) : null
            }
          />
        ) : null}

        {step === "connect" && !connectCelebration ? (
          <OnboardingActions
            compact
            tertiary={
              <s-stack alignItems="center" direction="inline" gap="small">
                {showBack ? (
                  <s-button onClick={handleBack} variant="tertiary">
                    Back
                  </s-button>
                ) : null}
                <s-button onClick={handleSkip} variant="tertiary">
                  Skip onboarding
                </s-button>
              </s-stack>
            }
          />
        ) : null}
      </s-stack>
    </s-page>
  );
}

function WelcomeStep() {
  return (
    <s-grid alignItems="start" gap="small" gridTemplateColumns="auto 1fr">
      <OnboardingCalloutImage
        alt="Revora onboarding illustration"
        size="compact"
      />
      <OnboardingJourneyList />
    </s-grid>
  );
}

function InstallStepContent() {
  return (
    <s-grid alignItems="start" gap="small" gridTemplateColumns="3fr 2fr">
      <OnboardingInstallDemoGif variant="split" />
      <s-banner heading="Extension required" tone="info">
        <s-paragraph>
          The extension is required for Revora to import reviews from Temu.
        </s-paragraph>
      </s-banner>
    </s-grid>
  );
}

interface ConnectStepContentProps {
  onConnected: () => void;
}

function ConnectStepContent({ onConnected }: ConnectStepContentProps) {
  return (
    <ConnectExtension
      checkStatusOnMount={false}
      compact
      onConnected={onConnected}
    />
  );
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
  );
}
