export const PANEL_ID = "revora-import-panel"
export const MESSAGE_TYPE = "REVORA_TEMU_REVIEWS"
export const BATCH_SIZE = 25
export const SCROLL_INTERVAL_MS = 1200
export const MAX_IDLE_ROUNDS = 15
export const DIALOG_WAIT_MS = 12000

export const panelRef = { shadow: null }

export const state = {
  collecting: false,
  reviews: new Map(),
  maxListSize: null,
  lastPageSeen: 0,
  idleRounds: 0,
  importId: null,
  uploadedIds: new Set(),
  pendingUpload: [],
  scrollContainer: null,
  plan: "free",
  planName: "Free",
  reviewLimit: 100,
  limitReached: false,
}

export function extractGoodsId() {
  const match = window.location.pathname.match(/-g-(\d+)\.html/i)
  return match?.[1] || null
}

export function getProductTitle() {
  const heading =
    document.querySelector("h1") ||
    document.querySelector('[data-type="title"]') ||
    document.querySelector("title")

  return heading?.textContent?.trim() || document.title
}

export function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function $(id) {
  return panelRef.shadow?.getElementById(id) ?? null
}