import { NextResponse } from "next/server";

const EXTENSION_METHODS = "GET, POST, DELETE, OPTIONS";
const EXTENSION_HEADERS = "Authorization, Content-Type, X-Revora-Extension-Id";

/**
 * Allowed CORS origin for extension API calls. When `REVORA_EXTENSION_ID` is
 * set (production), only that specific extension may read responses. When
 * unset (local dev), any `chrome-extension://` / `moz-extension://` origin is
 * allowed so a dev build with a different ID works without reconfiguring.
 */
function allowedExtensionOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  const pinnedId = process.env.REVORA_EXTENSION_ID?.trim();

  if (pinnedId) {
    return origin === `chrome-extension://${pinnedId}` ? origin : null;
  }

  if (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://")
  ) {
    return origin;
  }

  return null;
}

export function extensionCorsHeaders(origin: string | null) {
  const headers = new Headers();
  const allowed = allowedExtensionOrigin(origin);

  if (allowed) {
    headers.set("Access-Control-Allow-Origin", allowed);
    headers.set("Vary", "Origin");
    // Not needed: extension auth uses the Authorization header, not cookies.
  }

  headers.set("Access-Control-Allow-Methods", EXTENSION_METHODS);
  headers.set("Access-Control-Allow-Headers", EXTENSION_HEADERS);

  return headers;
}

export function extensionOptionsResponse(origin: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: extensionCorsHeaders(origin),
  });
}

export function extensionJsonResponse(
  body: unknown,
  origin: string | null,
  init?: { status?: number }
) {
  const headers = extensionCorsHeaders(origin);
  headers.set("Content-Type", "application/json");

  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers,
  });
}
