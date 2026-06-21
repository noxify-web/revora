/** Chatwoot website inbox token from Settings → Inboxes → Website → Configuration. */
export const CHATWOOT_WEBSITE_TOKEN =
  process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim() ?? ""

/** Chatwoot instance URL. Defaults to Chatwoot Cloud. */
export const CHATWOOT_BASE_URL =
  process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim() ||
  "https://app.chatwoot.com"

export function isChatwootEnabled() {
  return CHATWOOT_WEBSITE_TOKEN.length > 0
}

export const CHATWOOT_WIDGET_SETTINGS = {
  hideMessageBubble: false,
  showUnreadMessagesDialog: false,
  showPopoutButton: false,
  position: "right",
  locale: "en",
  useBrowserLanguage: false,
  type: "expanded_bubble",
  launcherTitle: "Help",
  darkMode: "auto",
  welcomeTitle: "Revora support",
  welcomeDescription:
    "Questions about the extension, imports, or publishing reviews? Send us a message.",
  availableMessage: "We're online — ask about setup, Temu imports, or publishing.",
  unavailableMessage:
    "We're away for now. Leave a message and we'll reply by email.",
  enableFileUpload: true,
  enableEmojiPicker: false,
  enableEndConversation: true,
} as const

export function formatShopDisplayName(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "").replace(/-/g, " ")
}