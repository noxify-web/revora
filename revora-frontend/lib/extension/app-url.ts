import { headers } from "next/headers";

export function getAppBaseUrlFromEnv() {
  const envUrl =
    process.env.HOST?.trim() || process.env.SHOPIFY_APP_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return null;
}

function getForwardedOrigin(
  forwardedHost: string | null,
  forwardedProto: string | null,
  fallbackHost?: string | null
) {
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`.replace(/\/$/, "");
  }

  if (fallbackHost) {
    const proto = fallbackHost.includes("localhost") ? "http" : "https";
    return `${proto}://${fallbackHost}`.replace(/\/$/, "");
  }

  return null;
}

export async function getAppBaseUrl(request?: Request) {
  if (request) {
    const forwarded = getForwardedOrigin(
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-forwarded-proto"),
      new URL(request.url).host
    );

    if (forwarded) {
      return forwarded;
    }
  }

  const fromEnv = getAppBaseUrlFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  const headerStore = await headers();
  const forwarded = getForwardedOrigin(
    headerStore.get("x-forwarded-host"),
    headerStore.get("x-forwarded-proto"),
    headerStore.get("host")
  );

  if (forwarded) {
    return forwarded;
  }

  return "http://localhost:3000";
}
