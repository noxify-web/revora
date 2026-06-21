import {
  EXTENSION_BATCH_SIZE,
  EXTENSION_DIALOG_WAIT_MS,
  EXTENSION_MAX_IDLE_ROUNDS,
  EXTENSION_SCROLL_INTERVAL_MS,
} from "@revora/shared/constants"
import type { TemuReviewPayload } from "@revora/shared/extension-types"

export const PANEL_ID = "revora-import-panel"

export const BATCH_SIZE = EXTENSION_BATCH_SIZE
export const SCROLL_INTERVAL_MS = EXTENSION_SCROLL_INTERVAL_MS
export const MAX_IDLE_ROUNDS = EXTENSION_MAX_IDLE_ROUNDS
export const DIALOG_WAIT_MS = EXTENSION_DIALOG_WAIT_MS

export const panelRef: { shadow: ShadowRoot | null } = { shadow: null }

export const state = {
  collecting: false,
  reviews: new Map<string, TemuReviewPayload>(),
  maxListSize: null as number | null,
  lastPageSeen: 0,
  idleRounds: 0,
  importId: null as string | null,
  uploadedIds: new Set<string>(),
  pendingUpload: [] as TemuReviewPayload[],
  scrollContainer: null as HTMLElement | null,
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

const RUNTIME_MESSAGE_TIMEOUT_MS = 30_000

export function sendRuntimeMessage<T>(
  message: unknown,
  timeoutMs = RUNTIME_MESSAGE_TIMEOUT_MS,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(
        new Error(
          "Extension request timed out. Reopen the Revora popup or refresh this page.",
        ),
      )
    }, timeoutMs)

    try {
      chrome.runtime.sendMessage(message, (response) => {
        window.clearTimeout(timer)

        const lastError = chrome.runtime.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }

        resolve(response as T)
      })
    } catch (error) {
      window.clearTimeout(timer)
      reject(
        error instanceof Error
          ? error
          : new Error("Failed to reach the Revora extension."),
      )
    }
  })
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function $(id: string) {
  return panelRef.shadow?.getElementById(id) ?? null
}