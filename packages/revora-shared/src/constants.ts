export const REVORA_CLIENT_ID = "8306c32501330f9312ff84788895ca36";

/** Liquid filename (without .liquid) for the storefront app embed block. */
export const REVORA_REVIEWS_EMBED_BLOCK_HANDLE = "reviews-embed";

/** Public logo paths served from revora-frontend/public (and mirrored in the extension). */
export const REVORA_LOGO_ASSETS = {
  ico: "/revora-logo.ico",
  png: "/revora-logo.png",
  svg: "/revora-logo.svg",
  /** Dark transparent mark for light surfaces (connect page, etc.). */
  transparentSvg: "/revora-logo-transparent.svg",
} as const;

/** Shopify admin app path uses the app handle, e.g. /apps/revora-1 */
export const REVORA_APP_PATH_PATTERN = /\/apps\/revora(?:-\d+)?(?:\/|$)/i;

/** Content-script / host_permissions patterns for local dev tunnels (ngrok, Cloudflare, localhost). */
export const REVORA_DEV_TUNNEL_MATCHES = [
  "https://*.trycloudflare.com/*",
  "https://*.ngrok-free.app/*",
  "https://*.ngrok-free.dev/*",
  "https://*.ngrok.io/*",
  "https://*.ngrok.app/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
] as const;

export const PAIRING_PREFIX = "REVORA1.";

export const TEMU_REVIEWS_API_PATH = "/api/bg/engels/reviews/list";

export const EXTENSION_BATCH_SIZE = 25;

export const EXTENSION_SCROLL_INTERVAL_MS = 500;

export const EXTENSION_MAX_IDLE_ROUNDS = 15;

export const EXTENSION_DIALOG_WAIT_MS = 12_000;
