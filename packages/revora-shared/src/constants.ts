export const REVORA_CLIENT_ID = "8306c32501330f9312ff84788895ca36";

/** Shopify app handle used in theme block type URLs (derived from the app listing name). */
export const REVORA_APP_HANDLE = "revora-import-temu-reviews";

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

/** True for local dev tunnel origins used by the embedded Revora app. */
export function isRevoraDevTunnelOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);

    if (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }

    if (protocol !== "https:") {
      return false;
    }

    return (
      hostname.endsWith(".trycloudflare.com") ||
      hostname.endsWith(".ngrok-free.app") ||
      hostname.endsWith(".ngrok-free.dev") ||
      hostname.endsWith(".ngrok.io") ||
      hostname.endsWith(".ngrok.app")
    );
  } catch {
    return false;
  }
}

/**
 * Exact origin of the Shopify admin top-level page. Used for pinned
 * `postMessage` targetOrigin checks (never use `*` for token-bearing messages).
 */
export const ADMIN_SHOPIFY_ORIGIN = "https://admin.shopify.com";

/**
 * chrome.storage.sync keys shared between the extension and (documentarily)
 * the frontend. Both sides must agree on these names — they are the contract
 * for persisted connection state. Defined here rather than as ad-hoc string
 * literals so the contract is in one place.
 */
export const STORAGE_KEYS = {
  API_BASE_URL: "apiBaseUrl",
  PAIRING_TOKEN: "pairingToken",
  SHOP: "shop",
  USER_DISCONNECTED: "userDisconnected",
  LAST_VERIFIED_AT: "lastVerifiedAt",
} as const;

/** Extension bearer-token lifetime. Refreshed on each successful /verify. */
export const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Local connection state is considered stale after this long without a
 * successful /verify. Drives the "only re-verify when stale" behavior in the
 * background, reducing per-popup-open server load.
 */
export const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long the admin app waits for a `REVORA_PAIRING_CONFIRMED` postMessage
 * from the extension before reporting "extension not detected".
 */
export const PAIRING_CONFIRMED_TIMEOUT_MS = 15_000;

export const TEMU_REVIEWS_API_PATH = "/api/bg/engels/reviews/list";

export const EXTENSION_BATCH_SIZE = 25;

export const EXTENSION_SCROLL_INTERVAL_MS = 500;

export const EXTENSION_MAX_IDLE_ROUNDS = 15;

export const EXTENSION_DIALOG_WAIT_MS = 12_000;
