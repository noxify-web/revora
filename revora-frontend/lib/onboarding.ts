export const ONBOARDING_STORAGE_KEYS = {
  dismissed: "revora-onboarding-dismissed",
  extensionInstallAck: "revora-onboarding-extension-install-ack",
} as const

/** Legacy + dashboard keys cleared by ?reset=1 in development. */
export const REVORA_CLIENT_STORAGE_KEYS = [
  ONBOARDING_STORAGE_KEYS.dismissed,
  ONBOARDING_STORAGE_KEYS.extensionInstallAck,
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
}

/**
 * Replace with your Chrome Web Store listing URL before launch.
 * Set NEXT_PUBLIC_CHROME_WEB_STORE_URL in .env.local to override.
 */
export const CHROME_WEB_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ??
  "https://chrome.google.com/webstore/detail/revora-temu-reviews/PLACEHOLDER_EXTENSION_ID"

/**
 * Set NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID to a YouTube video ID (e.g. "dQw4w9WgXcQ")
 * to embed a walkthrough. Leave unset to show the placeholder card.
 */
function sanitizeYoutubeVideoId(raw: string | undefined) {
  const trimmed = raw?.trim() ?? ""
  return /^[\w-]{6,32}$/.test(trimmed) ? trimmed : ""
}

export const ONBOARDING_YOUTUBE_VIDEO_ID = sanitizeYoutubeVideoId(
  process.env.NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID,
)

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