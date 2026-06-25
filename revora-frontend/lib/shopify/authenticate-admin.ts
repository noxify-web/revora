import { RequestedTokenType, type Session } from "@shopify/shopify-api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { extensionJsonResponse } from "@/lib/extension/cors";
import {
  getMissingConfiguredScopes,
  sessionHasRequiredScopes,
} from "@/lib/shopify/required-scopes";

import { getShopify, sessionStorage } from "./shopify";

export interface AuthenticatedAdmin {
  admin: InstanceType<ReturnType<typeof getShopify>["clients"]["Graphql"]>;
  session: Session;
  shop: string;
}

export class AdminAuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Session expired. Reload Revora from Shopify admin.") {
    super(message);
    this.name = "AdminAuthenticationError";
  }
}

function getSessionToken(
  authorizationHeader: string | null,
  idToken: string | null
): string | null {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.replace("Bearer ", "");
  }

  return idToken;
}

function buildBounceRedirectUrl(
  pathname: string,
  searchParams: URLSearchParams
) {
  const params = new URLSearchParams(searchParams);
  params.delete("id_token");

  const reloadPath = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname;

  params.set("shopify-reload", reloadPath);

  return `/session-token-bounce?${params.toString()}`;
}

async function exchangeOfflineSession(shop: string, sessionToken: string) {
  const shopify = getShopify();
  const offlineId = shopify.session.getOfflineId(shop);

  await sessionStorage.deleteSession(offlineId);

  const { session: exchangedSession } = await shopify.auth.tokenExchange({
    shop,
    sessionToken,
    requestedTokenType: RequestedTokenType.OfflineAccessToken,
  });

  await sessionStorage.storeSession(exchangedSession);

  return exchangedSession;
}

export async function refreshOfflineSession(
  shop: string,
  sessionToken: string
) {
  const session = await exchangeOfflineSession(shop, sessionToken);

  return {
    session,
    missingScopes: getMissingConfiguredScopes(session),
    scopeUpgradeRequired: !sessionHasRequiredScopes(session),
  };
}

async function resolveAuthenticatedAdmin(
  searchParams: URLSearchParams
): Promise<AuthenticatedAdmin> {
  const headerStore = await headers();
  const sessionToken = getSessionToken(
    headerStore.get("authorization"),
    searchParams.get("id_token")
  );

  if (!sessionToken) {
    throw new AdminAuthenticationError();
  }

  try {
    const shopify = getShopify();
    const decoded = await shopify.session.decodeSessionToken(sessionToken);
    const dest = new URL(decoded.dest);
    const shop = dest.hostname;
    const offlineId = shopify.session.getOfflineId(shop);
    let session = await sessionStorage.loadSession(offlineId);

    if (!(session?.accessToken && sessionHasRequiredScopes(session))) {
      session = await exchangeOfflineSession(shop, sessionToken);
    }

    return {
      shop,
      session: session as Session,
      admin: new shopify.clients.Graphql({ session }),
    };
  } catch (error) {
    console.error("Revora authenticateAdmin failed", error);
    throw new AdminAuthenticationError();
  }
}

export async function authenticateAdmin(searchParams: URLSearchParams) {
  try {
    return await resolveAuthenticatedAdmin(searchParams);
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect(buildBounceRedirectUrl("/", searchParams));
    }

    throw error;
  }
}

export function authenticateAdminApi(searchParams: URLSearchParams) {
  return resolveAuthenticatedAdmin(searchParams);
}

export function adminAuthFailureResponse(
  error: unknown,
  respond: (body: unknown, status?: number) => Response
): Response | null {
  if (error instanceof AdminAuthenticationError) {
    return respond({ error: error.message }, error.status);
  }

  return null;
}

interface AdminApiHandlerOptions {
  defaultErrorMessage?: string;
  defaultErrorStatus?: number;
  logPrefix?: string;
}

export async function withAdminApi(
  request: Request,
  handler: (ctx: AuthenticatedAdmin) => Promise<Response>,
  options?: AdminApiHandlerOptions
): Promise<Response> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const url = new URL(request.url);

  try {
    const ctx = await authenticateAdminApi(url.searchParams);
    return await handler(ctx);
  } catch (error) {
    const authResponse = adminAuthFailureResponse(error, (body, status) =>
      extensionJsonResponse(body, origin, { status })
    );

    if (authResponse) {
      return authResponse;
    }

    if (options?.logPrefix) {
      console.error(options.logPrefix, error);
    }

    const message =
      error instanceof Error
        ? error.message
        : (options?.defaultErrorMessage ?? "Request failed");

    return extensionJsonResponse({ error: message }, origin, {
      status: options?.defaultErrorStatus ?? 500,
    });
  }
}
