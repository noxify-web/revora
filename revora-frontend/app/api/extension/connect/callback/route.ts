import { type NextRequest, NextResponse } from "next/server";

import {
  buildExtensionErrorRedirectUrl,
  buildExtensionRedirectUrl,
  EXTENSION_REDIRECT_COOKIE,
  isValidExtensionRedirectUri,
  mintExtensionTokenForShop,
} from "@/lib/extension/browser-connect";
import { ensureShopPlan } from "@/lib/shopify/plan-store";
import { getShopify, sessionStorage } from "@/lib/shopify/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUri = request.cookies.get(EXTENSION_REDIRECT_COOKIE)?.value;

  if (!(redirectUri && isValidExtensionRedirectUri(redirectUri))) {
    return NextResponse.json(
      {
        error:
          "Extension connect session expired. Try again from the extension.",
      },
      { status: 400 }
    );
  }

  try {
    const shopify = getShopify();
    const callbackResponse = await shopify.auth.callback({
      rawRequest: request,
    });

    await sessionStorage.storeSession(callbackResponse.session);
    await ensureShopPlan(callbackResponse.session.shop);

    const payload = await mintExtensionTokenForShop(
      callbackResponse.session.shop,
      request
    );

    const response = NextResponse.redirect(
      buildExtensionRedirectUrl(redirectUri, payload)
    );

    response.cookies.delete(EXTENSION_REDIRECT_COOKIE);

    if (callbackResponse.headers) {
      for (const [key, value] of Object.entries(callbackResponse.headers)) {
        if (typeof value === "string") {
          response.headers.set(key, value);
        }
      }
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Shopify authorization failed. Try again from the extension.";

    const response = NextResponse.redirect(
      buildExtensionErrorRedirectUrl(redirectUri, message)
    );
    response.cookies.delete(EXTENSION_REDIRECT_COOKIE);
    return response;
  }
}
