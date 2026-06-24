import { NextResponse } from "next/server";

const STOREFRONT_METHODS = "GET, POST, OPTIONS";
const STOREFRONT_HEADERS = "Content-Type";

const MYSHOPIFY_ORIGIN = /^https:\/\/[\w-]+\.myshopify\.com$/;

export function isAllowedStorefrontOrigin(origin: string | null) {
  return Boolean(origin && MYSHOPIFY_ORIGIN.test(origin));
}

export function storefrontCorsHeaders(origin: string | null) {
  const headers = new Headers();

  if (isAllowedStorefrontOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin as string);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Allow-Methods", STOREFRONT_METHODS);
  headers.set("Access-Control-Allow-Headers", STOREFRONT_HEADERS);

  return headers;
}

export function storefrontOptionsResponse(origin: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: storefrontCorsHeaders(origin),
  });
}

export function storefrontJsonResponse(
  body: unknown,
  origin: string | null,
  init?: { status?: number }
) {
  const headers = storefrontCorsHeaders(origin);
  headers.set("Content-Type", "application/json");

  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers,
  });
}
