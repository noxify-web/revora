"use client"

import { useCallback, useState, type ReactNode } from "react"

import {
  CHROME_WEB_STORE_URL,
  ONBOARDING_CALLOUT_IMAGE,
  ONBOARDING_INSTALL_DEMO_GIF,
  ONBOARDING_JOURNEY_BULLETS,
  ONBOARDING_STORAGE_KEYS,
} from "@/lib/onboarding"

export function openChromeWebStore() {
  window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer")
}

export function useExtensionInstallAck() {
  const [installAcked, setInstallAcked] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(
        ONBOARDING_STORAGE_KEYS.extensionInstallAck,
      ) === "true",
  )

  const acknowledgeExtensionInstall = useCallback(() => {
    setInstallAcked(true)
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEYS.extensionInstallAck,
      "true",
    )
  }, [])

  return { installAcked, acknowledgeExtensionInstall }
}

type OnboardingProgressProps = {
  current: number
  total: number
  variant?: "wizard" | "checklist"
}

export function OnboardingProgress({
  current,
  total,
  variant = "wizard",
}: OnboardingProgressProps) {
  const progressText =
    variant === "wizard"
      ? `Step ${current} of ${total}`
      : `${current} of ${total} steps complete`

  return <s-text color="subdued">{progressText}</s-text>
}

type OnboardingActionsProps = {
  primary?: ReactNode
  secondary?: ReactNode
  tertiary?: ReactNode
}

type OnboardingActionsPropsWithVariant = OnboardingActionsProps & {
  compact?: boolean
}

export function OnboardingActions({
  primary,
  secondary,
  tertiary,
  compact = false,
}: OnboardingActionsPropsWithVariant) {
  if (!primary && !secondary && !tertiary) {
    return null
  }

  return (
    <s-grid
      gridTemplateColumns="1fr auto"
      gap="small"
      alignItems="center"
      paddingBlockStart={compact ? "small-200" : "base"}
    >
      <s-box>{tertiary}</s-box>
      <s-stack direction="inline" gap="small" alignItems="center">
        {secondary}
        {primary}
      </s-stack>
    </s-grid>
  )
}

type ExtensionInstallActionsProps = {
  installComplete: boolean
  onAcknowledgeInstall: () => void
  onInstalledClick?: () => void
}

export function ExtensionInstallActions({
  installComplete,
  onAcknowledgeInstall,
  onInstalledClick,
}: ExtensionInstallActionsProps) {
  return (
    <s-stack direction="inline" gap="small" alignItems="center">
      <s-button
        variant="primary"
        icon="external"
        onClick={() => {
          onAcknowledgeInstall()
          openChromeWebStore()
        }}
      >
        Add to Chrome
      </s-button>
      <s-button
        variant="secondary"
        icon={installComplete ? "check-circle" : "check"}
        onClick={onInstalledClick ?? onAcknowledgeInstall}
        disabled={installComplete}
      >
        {installComplete ? "Extension ready" : "I've installed it"}
      </s-button>
    </s-stack>
  )
}

export function OnboardingJourneyList() {
  return (
    <s-ordered-list>
      {ONBOARDING_JOURNEY_BULLETS.map((bullet) => (
        <s-list-item key={bullet}>{bullet}</s-list-item>
      ))}
    </s-ordered-list>
  )
}

type OnboardingCalloutImageProps = {
  size?: "hero" | "compact"
  alt?: string
}

type OnboardingInstallDemoGifProps = {
  variant?: "stacked" | "split"
}

export function OnboardingInstallDemoGif({
  variant = "stacked",
}: OnboardingInstallDemoGifProps) {
  const isSplit = variant === "split"

  return (
    <s-box
      border="base"
      borderRadius="base"
      overflow="hidden"
      background="subdued"
      minBlockSize={isSplit ? "220px" : undefined}
    >
      <img
        src={ONBOARDING_INSTALL_DEMO_GIF}
        alt="How to add Revora to Chrome"
        style={{
          display: "block",
          width: "100%",
          height: isSplit ? "100%" : "168px",
          minHeight: isSplit ? "220px" : undefined,
          objectFit: "cover",
        }}
      />
    </s-box>
  )
}

export function OnboardingCalloutImage({
  size = "hero",
  alt = "Revora setup illustration",
}: OnboardingCalloutImageProps) {
  const maxSize = size === "hero" ? "160px" : "80px"

  return (
    <s-box maxInlineSize={maxSize} maxBlockSize={maxSize}>
      <s-image
        src={ONBOARDING_CALLOUT_IMAGE}
        alt={alt}
        aspectRatio="1/1"
      />
    </s-box>
  )
}

type OnboardingContentWellProps = {
  children: ReactNode
}

export function OnboardingContentWell({ children }: OnboardingContentWellProps) {
  return (
    <s-box padding="base" background="subdued" borderRadius="base">
      {children}
    </s-box>
  )
}