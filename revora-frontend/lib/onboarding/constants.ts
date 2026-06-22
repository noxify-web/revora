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

