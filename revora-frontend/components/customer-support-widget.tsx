"use client"

import { useEffect, useRef } from "react"

import {
  CHATWOOT_BASE_URL,
  CHATWOOT_WEBSITE_TOKEN,
  isChatwootEnabled,
} from "@/lib/chatwoot"

function readShopFromUrl() {
  if (typeof window === "undefined") {
    return null
  }

  return new URLSearchParams(window.location.search).get("shop")?.trim() || null
}

function configureChatwootUser() {
  const shop = readShopFromUrl()
  if (!shop || !window.$chatwoot) {
    return
  }

  window.$chatwoot.setUser(shop, {
    name: shop.replace(/\.myshopify\.com$/, ""),
    company_name: shop,
  })

  window.$chatwoot.setCustomAttributes({
    shop,
    app: "revora",
  })
}

export function CustomerSupportWidget() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isChatwootEnabled() || initializedRef.current) {
      return
    }

    initializedRef.current = true

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: "right",
      locale: "en",
      type: "standard",
      darkMode: "auto",
      welcomeTitle: "Need help?",
      welcomeDescription: "We're here to help with Revora.",
      availableMessage: "We're online and ready to chat.",
      unavailableMessage: "Leave a message and we'll get back to you.",
      enableFileUpload: true,
      enableEmojiPicker: true,
      enableEndConversation: true,
    }

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