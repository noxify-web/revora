export const ONBOARDING_STORAGE_KEYS = {
  dismissed: "revora-onboarding-dismissed",
  extensionInstallAck: "revora-onboarding-extension-install-ack",
  flowComplete: "revora-onboarding-flow-complete",
  flowStep: "revora-onboarding-flow-step",
} as const

export const ONBOARDING_FLOW_STEPS = [
  {
    id: "welcome",
    title: "Welcome",
    summary: "See how Revora imports Temu reviews into Shopify.",
  },
  {
    id: "install",
    title: "Install extension",
    summary: "Add the Chrome extension that reads reviews on Temu.",
  },
  {
    id: "connect",
    title: "Connect store",
    summary: "Link the extension to this Shopify store.",
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

  window.dispatchEvent(new CustomEvent("revora:reopen-onboarding"))
  window.dispatchEvent(new CustomEvent("revora:onboarding-flow-reset"))
}

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