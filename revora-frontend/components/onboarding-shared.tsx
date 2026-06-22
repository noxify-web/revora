"use client";

import { type ReactNode, useCallback } from "react";

import {
  CHROME_WEB_STORE_URL,
  ONBOARDING_CALLOUT_IMAGE,
  ONBOARDING_INSTALL_DEMO_GIF,
  ONBOARDING_JOURNEY_BULLETS,
} from "@/lib/onboarding";
import {
  acknowledgeExtensionInstall,
  useOnboardingStore,
} from "@/lib/onboarding/store";

export function openChromeWebStore() {
  window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer");
}

export function useExtensionInstallAck() {
  const { extensionInstallAck } = useOnboardingStore();

  return {
    installAcked: extensionInstallAck,
    acknowledgeExtensionInstall: useCallback(() => {
      acknowledgeExtensionInstall();
    }, []),
  };
}

interface OnboardingProgressProps {
  current: number;
  total: number;
  variant?: "wizard" | "checklist";
}

export function OnboardingProgress({
  current,
  total,
  variant = "wizard",
}: OnboardingProgressProps) {
  const progressText =
    variant === "wizard"
      ? `Step ${current} of ${total}`
      : `${current} of ${total} steps complete`;

  return <s-text color="subdued">{progressText}</s-text>;
}

interface OnboardingActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
}

type OnboardingActionsPropsWithVariant = OnboardingActionsProps & {
  compact?: boolean;
};

export function OnboardingActions({
  primary,
  secondary,
  tertiary,
  compact = false,
}: OnboardingActionsPropsWithVariant) {
  if (!(primary || secondary || tertiary)) {
    return null;
  }

  return (
    <s-grid
      alignItems="center"
      gap="small"
      gridTemplateColumns="1fr auto"
      paddingBlockStart={compact ? "small-200" : "base"}
    >
      <s-box>{tertiary}</s-box>
      <s-stack alignItems="center" direction="inline" gap="small">
        {secondary}
        {primary}
      </s-stack>
    </s-grid>
  );
}

interface ExtensionInstallActionsProps {
  installComplete: boolean;
  onAcknowledgeInstall: () => void;
  onInstalledClick?: () => void;
}

export function ExtensionInstallActions({
  installComplete,
  onAcknowledgeInstall,
  onInstalledClick,
}: ExtensionInstallActionsProps) {
  return (
    <s-stack alignItems="center" direction="inline" gap="small">
      <s-button
        icon="external"
        onClick={() => {
          onAcknowledgeInstall();
          openChromeWebStore();
        }}
        variant="primary"
      >
        Add to Chrome
      </s-button>
      <s-button
        disabled={installComplete}
        icon={installComplete ? "check-circle" : "check"}
        onClick={onInstalledClick ?? onAcknowledgeInstall}
        variant="secondary"
      >
        {installComplete ? "Extension ready" : "I've installed it"}
      </s-button>
    </s-stack>
  );
}

export function OnboardingJourneyList() {
  return (
    <s-ordered-list>
      {ONBOARDING_JOURNEY_BULLETS.map((bullet) => (
        <s-list-item key={bullet}>{bullet}</s-list-item>
      ))}
    </s-ordered-list>
  );
}

interface OnboardingCalloutImageProps {
  alt?: string;
  size?: "hero" | "compact";
}

interface OnboardingInstallDemoGifProps {
  variant?: "stacked" | "split";
}

export function OnboardingInstallDemoGif({
  variant = "stacked",
}: OnboardingInstallDemoGifProps) {
  const isSplit = variant === "split";

  return (
    <s-box
      background="subdued"
      border="base"
      borderRadius="base"
      minBlockSize={isSplit ? "220px" : undefined}
      overflow="hidden"
    >
      <img
        alt="How to add Revora to Chrome"
        height={220}
        src={ONBOARDING_INSTALL_DEMO_GIF}
        style={{
          display: "block",
          width: "100%",
          height: isSplit ? "100%" : "168px",
          minHeight: isSplit ? "220px" : undefined,
          objectFit: "cover",
        }}
        width={400}
      />
    </s-box>
  );
}

export function OnboardingCalloutImage({
  size = "hero",
  alt = "Revora setup illustration",
}: OnboardingCalloutImageProps) {
  const maxSize = size === "hero" ? "160px" : "80px";

  return (
    <s-box maxBlockSize={maxSize} maxInlineSize={maxSize}>
      <s-image alt={alt} aspectRatio="1/1" src={ONBOARDING_CALLOUT_IMAGE} />
    </s-box>
  );
}

interface OnboardingContentWellProps {
  children: ReactNode;
}

export function OnboardingContentWell({
  children,
}: OnboardingContentWellProps) {
  return (
    <s-box background="subdued" borderRadius="base" padding="base">
      {children}
    </s-box>
  );
}
