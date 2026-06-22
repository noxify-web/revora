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

/**
 * Replace with your Chrome Web Store listing URL before launch.
 * Set NEXT_PUBLIC_CHROME_WEB_STORE_URL in .env.local to override.
 */
export const CHROME_WEB_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ??
  "https://chrome.google.com/webstore/detail/revora-temu-reviews/PLACEHOLDER_EXTENSION_ID"

const DEFAULT_ONBOARDING_YOUTUBE_VIDEO_ID = "T-YyHx8kc9I"

function sanitizeYoutubeVideoId(raw: string | undefined) {
  const trimmed = raw?.trim() ?? ""
  return /^[\w-]{6,32}$/.test(trimmed) ? trimmed : ""
}

/** Onboarding walkthrough embed. Override with NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID. */
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