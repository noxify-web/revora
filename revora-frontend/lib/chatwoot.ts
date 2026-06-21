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