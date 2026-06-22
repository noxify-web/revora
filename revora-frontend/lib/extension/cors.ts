import { NextResponse } from "next/server";

const EXTENSION_METHODS = "GET, POST, DELETE, OPTIONS";
const EXTENSION_HEADERS = "Authorization, Content-Type";

export function extensionCorsHeaders(origin: string | null) {
  const headers = new Headers();

  if (
    origin?.startsWith("chrome-extension://") ||
    origin?.startsWith("moz-extension://")
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
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
