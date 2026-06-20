import type { ConnectTokenResponse } from "@revora/shared/extension-types"

function parseConnectCallback(responseUrl: string): ConnectTokenResponse {
  const url = new URL(responseUrl)
  const error = url.searchParams.get("error")?.trim()

  if (error) {
    throw new Error(error)
  }

  const token = url.searchParams.get("token")?.trim()
  const apiUrl = url.searchParams.get("api_url")?.trim()
  const shop = url.searchParams.get("shop")?.trim()

  if (!token || !apiUrl || !shop) {
    throw new Error("Revora sign-in did not return a complete connection payload.")
  }

  const reviewLimitParam = url.searchParams.get("review_limit")

  return {
    token,
    apiUrl: apiUrl.replace(/\/$/, ""),
    shop,
    plan: url.searchParams.get("plan")?.trim() || "free",
    planName: url.searchParams.get("plan_name")?.trim() || "Free",
    reviewLimit:
      reviewLimitParam == null || reviewLimitParam === ""
        ? null
        : Number(reviewLimitParam),
  }
}

export async function connectViaBrowser(
  apiBaseUrl: string,
): Promise<ConnectTokenResponse> {
  const normalizedBase = apiBaseUrl.replace(/\/$/, "")
  const redirectUri = chrome.identity.getRedirectURL()
  const connectUrl = new URL("/api/extension/connect/browser", normalizedBase)
  connectUrl.searchParams.set("redirect_uri", redirectUri)

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: connectUrl.toString(),
        interactive: true,
      },
      (callbackUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!callbackUrl) {
          reject(new Error("Sign-in was cancelled."))
          return
        }

        resolve(callbackUrl)
      },
    )
  })

  return parseConnectCallback(responseUrl)
}