"use client"

import { useEffect, useRef } from "react"

import {
  CHATWOOT_BASE_URL,
  CHATWOOT_WEBSITE_TOKEN,
  CHATWOOT_WIDGET_SETTINGS,
  formatShopDisplayName,
  isChatwootEnabled,
} from "@/lib/chatwoot"

const WIDGET_LAYOUT_STYLE_ID = "revora-chatwoot-layout"

function readShopFromUrl() {
  if (typeof window === "undefined") {
    return null
  }

  return new URLSearchParams(window.location.search).get("shop")?.trim() || null
}

function ensureWidgetLayoutStyles() {
  if (document.getElementById(WIDGET_LAYOUT_STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = WIDGET_LAYOUT_STYLE_ID
  style.textContent = `
    #woot-widget-holder {
      z-index: 9999 !important;
      right: 20px !important;
      bottom: 20px !important;
    }

    .woot-widget-bubble.woot-elements--right {
      right: 20px !important;
      bottom: 20px !important;
    }

    .woot--bubble-holder {
      z-index: 9999 !important;
    }
  `
  document.head.appendChild(style)
}

function configureChatwootUser() {
  const shop = readShopFromUrl()
  if (!shop || !window.$chatwoot) {
    return
  }

  window.$chatwoot.setUser(shop, {
    name: formatShopDisplayName(shop),
    company_name: shop,
    description: "Revora merchant",
  })

  window.$chatwoot.setCustomAttributes({
    shop,
    app: "revora",
    surface: "shopify-admin",
  })

  window.$chatwoot.setLabel("revora-support")
}

export function CustomerSupportWidget() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isChatwootEnabled() || initializedRef.current) {
      return
    }

    initializedRef.current = true
    ensureWidgetLayoutStyles()

    window.chatwootSettings = { ...CHATWOOT_WIDGET_SETTINGS }

    function handleReady() {
      configureChatwootUser()
    }

    window.addEventListener("chatwoot:ready", handleReady)

    const script = document.createElement("script")
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
    script.defer = true
    script.async = true
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      })
    }
    document.body.appendChild(script)

    return () => {
      window.removeEventListener("chatwoot:ready", handleReady)
    }
  }, [])

  return null
}