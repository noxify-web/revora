export const ONBOARDING_STORAGE_KEYS = {
  dismissed: "revora-onboarding-dismissed",
  extensionInstallAck: "revora-onboarding-extension-install-ack",
  flowComplete: "revora-onboarding-flow-complete",
  flowStep: "revora-onboarding-flow-step",
  flowRestarted: "revora-onboarding-flow-restarted",
} as const

const LEGACY_SETUP_GUIDE_DISMISSED = "revora-setup-guide-dismissed"

export const ONBOARDING_CALLOUT_IMAGE =
  "https://cdn.shopify.com/static/images/polaris/patterns/callout.png"

const DEFAULT_ONBOARDING_INSTALL_DEMO_GIF =
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzRnZGc1bHAxbHB3MzczNXd4OTR2bXZwdGljY3hmcjVzcHEwaDRxeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1wR4V5Y0Wqjn0Jgh2k/giphy.gif"

/** Placeholder install walkthrough GIF. Override with NEXT_PUBLIC_ONBOARDING_INSTALL_GIF. */
export const ONBOARDING_INSTALL_DEMO_GIF =
  process.env.NEXT_PUBLIC_ONBOARDING_INSTALL_GIF?.trim() ||
  DEFAULT_ONBOARDING_INSTALL_DEMO_GIF

export const ONBOARDING_JOURNEY_BULLETS = [
  "Install the Revora Chrome extension",
  "Connect it to this Shopify store",
  "Import reviews from any Temu product page",
] as const

export const ONBOARDING_FLOW_STEPS = [
  {
    id: "welcome",
    title: "Import Temu reviews into Shopify",
    summary: "Three quick steps to get started.",
  },
  {
    id: "install",
    title: "Install extension",
    summary: "Required for Revora to import reviews from Temu.",
  },
  {
    id: "connect",
    title: "Connect store",
    summary: "Keep this tab open and click Connect.",
  },
] as const

export type OnboardingFlowStepId =
  (typeof ONBOARDING_FLOW_STEPS)[number]["id"]

/** Legacy + dashboard keys cleared by ?reset=1 in development. */
export const REVORA_CLIENT_STORAGE_KEYS = [
  ONBOARDING_STORAGE_KEYS.dismissed,
  ONBOARDING_STORAGE_KEYS.extensionInstallAck,
  ONBOARDING_STORAGE_KEYS.flowComplete,
  ONBOARDING_STORAGE_KEYS.flowStep,
  ONBOARDING_STORAGE_KEYS.flowRestarted,
  "revora-setup-guide-dismissed",
  "revora-auto-import",
] as const

export function clearRevoraClientStorage() {
  if (typeof window === "undefined") {
    return
  }

  for (const key of REVORA_CLIENT_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }

  window.dispatchEvent(new CustomEvent("revora:onboarding-flow-reset"))
  window.dispatchEvent(new CustomEvent("revora:reopen-onboarding"))
}

/** Clear all client onboarding state and reopen the 3-step wizard. */
export function resetOnboardingWizardState() {
  if (typeof window === "undefined") {
    return
  }

  clearRevoraClientStorage()
  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowRestarted, "true")
}

export const resetOnboardingForDev = resetOnboardingWizardState

export function readOnboardingFlowStep(): OnboardingFlowStepId {
  if (typeof window === "undefined") {
    return "welcome"
  }

  const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowStep)
  if (
    stored === "welcome" ||
    stored === "install" ||
    stored === "connect"
  ) {
    return stored
  }

  return "welcome"
}

export function writeOnboardingFlowStep(step: OnboardingFlowStepId) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowStep, step)
}

export function isOnboardingFlowComplete() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowComplete) ===
    "true"
  )
}

function isFlowRestartPending() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowRestarted) ===
    "true"
  )
}

/** Hydrate flow-complete state and migrate legacy localStorage keys once. */
export function hydrateOnboardingFlowComplete() {
  if (typeof window === "undefined") {
    return false
  }

  if (isOnboardingFlowComplete()) {
    return true
  }

  if (isFlowRestartPending()) {
    return false
  }

  if (
    window.localStorage.getItem(LEGACY_SETUP_GUIDE_DISMISSED) === "true"
  ) {
    completeOnboardingFlow()
    return true
  }

  return false
}

export function consumeFlowRestarted() {
  if (typeof window === "undefined") {
    return false
  }

  const restarted =
    window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowRestarted) ===
    "true"

  if (restarted) {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowRestarted)
  }

  return restarted
}

export function completeOnboardingFlow() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowComplete, "true")
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowStep)
  window.dispatchEvent(new CustomEvent("revora:onboarding-flow-complete"))
}

export function skipOnboardingFlow() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowComplete, "true")
  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.dismissed, "true")
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowStep)
  window.dispatchEvent(new CustomEvent("revora:onboarding-flow-complete"))
  window.dispatchEvent(new CustomEvent("revora:onboarding-dismissed"))
}

export function restartOnboardingFlow() {
  resetOnboardingWizardState()
}

/**
 * Replace with your Chrome Web Store listing URL before launch.
 * Set NEXT_PUBLIC_CHROME_WEB_STORE_URL in .env.local to override.
 */
export const CHROME_WEB_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ??
  "https://chrome.google.com/webstore/detail/revora-temu-reviews/PLACEHOLDER_EXTENSION_ID"

const DEFAULT_ONBOARDING_YOUTUBE_VIDEO_ID = "T-YyHx8kc9I"

/**
 * Onboarding walkthrough embed. Override with NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID.
 */
function sanitizeYoutubeVideoId(raw: string | undefined) {
  const trimmed = raw?.trim() ?? ""
  return /^[\w-]{6,32}$/.test(trimmed) ? trimmed : ""
}

export const ONBOARDING_YOUTUBE_VIDEO_ID =
  sanitizeYoutubeVideoId(process.env.NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID) ||
  DEFAULT_ONBOARDING_YOUTUBE_VIDEO_ID

export const ONBOARDING_STEPS = [
  {
    id: "install",
    title: "Install the Chrome extension",
    summary: "Add Revora from the Chrome Web Store — it runs on Temu product pages.",
  },
  {
    id: "connect",
    title: "Connect extension to your store",
    summary: "Link the extension to this Shopify store while this admin tab is open.",
  },
  {
    id: "import",
    title: "Import Temu reviews",
    summary: "Open a Temu listing in Chrome, pick a Shopify product, and import.",
  },
  {
    id: "publish",
    title: "Publish and display reviews",
    summary: "Publish imported reviews and enable the storefront widget.",
  },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"]