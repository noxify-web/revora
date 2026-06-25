import { headers } from "next/headers";

/**
 * Server-side API base URL advertised to the extension. Resolved from
 * `REVORA_API_BASE_URL` (preferred) or `HOST`/`SHOPIFY_APP_URL`, with a
 * localhost fallback for `next dev`.
 *
 * Note: this intentionally does NOT trust `x-forwarded-host` /
 * `x-forwarded-proto` request headers for the value sent to the extension —
 * those are client-supplied and spoofable. The tunnel/proxy is expected to set
 * the canonical URL via env so the extension always dials back to a host we
 * control.
 */
export function getAppBaseUrlFromEnv() {
  const envUrl =
    process.env.REVORA_API_BASE_URL?.trim() ||
    process.env.HOST?.trim() ||
    process.env.SHOPIFY_APP_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return null;
}

export async function getAppBaseUrl(request?: Request) {
  const fromEnv = getAppBaseUrlFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  const headerStore = await headers();
  const host = headerStore.get("host");

  if (host) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
