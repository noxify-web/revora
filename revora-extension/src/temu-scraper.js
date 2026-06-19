import {
  DIALOG_WAIT_MS,
  state,
  sleep,
} from "./temu-shared.js"
import { getImportFilter, setProgress, setStatus } from "./temu-panel.js"

export function getFilterLabel(filter) {
  if (filter === "withText") return "with text"
  if (filter === "withPictures") return "with photos/videos"
  return "reviews"
}

export function reviewHasText(review) {
  const comment = (review.comment || "").trim()
  const translated = (review.review_lang?.translate_comment || "").trim()
  return comment.length > 0 || translated.length > 0
}

export function reviewHasPictures(review) {
  return Array.isArray(review.pictures) && review.pictures.length > 0
}

export function reviewMatchesFilter(review, filter = getImportFilter()) {
  if (filter === "withText") {
    return reviewHasText(review)
  }

  if (filter === "withPictures") {
    return reviewHasPictures(review)
  }

  return true
}

export function resetCollection() {
  state.reviews.clear()
  state.maxListSize = null
  state.lastPageSeen = 0
  state.idleRounds = 0
  state.importId = null
  state.uploadedIds.clear()
  state.pendingUpload = []
  state.scrollContainer = null
  state.limitReached = false
}

export function ingestPayload(payload) {
  if (!payload?.reviews?.length) {
    return
  }

  const filter = getImportFilter()

  for (const review of payload.reviews) {
    if (!review?.review_id) continue
    if (!reviewMatchesFilter(review, filter)) continue
    state.reviews.set(String(review.review_id), review)
  }

  if (payload.maxListSize != null) {
    state.maxListSize = payload.maxListSize
  }

  if (payload.page != null) {
    state.lastPageSeen = Math.max(state.lastPageSeen, payload.page)
  }

  state.idleRounds = 0

  const label = getFilterLabel(filter)
  const total =
    state.reviewLimit || state.maxListSize || state.reviews.size
  setProgress(state.reviews.size, total)
  const limitSuffix =
    state.reviewLimit != null
      ? ` / ${state.reviewLimit}`
      : state.maxListSize
        ? ` / ${state.maxListSize}`
        : ""
  setStatus(`Collected ${state.reviews.size}${limitSuffix} ${label}`)
}

export function resolveReviewsSelector(input) {
  const trimmed = (input || "").trim()
  if (!trimmed) return null

  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith(".") ||
    trimmed.startsWith("[")
  ) {
    return trimmed
  }

  return `#${trimmed}`
}

export async function getReviewsButtonSelector() {
  const stored = await chrome.storage.sync.get(["temuAllReviewsSelector"])
  return resolveReviewsSelector(stored.temuAllReviewsSelector)
}

export function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim()
}

function isInsideReviewsDialog(node) {
  return Boolean(node?.closest('[role="dialog"][aria-modal="true"]'))
}

function isSeeAllReviewsLabel(text) {
  const normalized = normalizeText(text)
  return (
    normalized === "See all reviews" ||
    normalized === "See all reviews >" ||
    normalized === "See all reviews ›"
  )
}

function isExcludedReviewsText(text) {
  const normalized = normalizeText(text)
  if (!normalized) return true
  if (/verified purchases/i.test(normalized)) return true
  if (/^\d[\d,.\s]*\+?\s*reviews?$/i.test(normalized)) return true
  if (/^item reviews$/i.test(normalized)) return true
  return false
}

export function findSeeAllReviewsButton() {
  for (const span of document.querySelectorAll("span._3LqgzxHv")) {
    if (!isSeeAllReviewsLabel(span.textContent)) continue

    const button = span.closest('[role="button"]')
    if (button && !isInsideReviewsDialog(button)) {
      return button
    }
  }

  for (const button of document.querySelectorAll('div[role="button"].MONl7TFo')) {
    if (isInsideReviewsDialog(button)) continue
    if (isSeeAllReviewsLabel(button.textContent)) {
      return button
    }
  }

  let bestMatch = null

  for (const node of document.querySelectorAll(
    '[role="button"], button, a[href], div[tabindex="0"]',
  )) {
    if (isInsideReviewsDialog(node)) continue

    const text = normalizeText(node.textContent)
    if (!isSeeAllReviewsLabel(text) || isExcludedReviewsText(text)) {
      continue
    }

    if (
      !bestMatch ||
      text.length < normalizeText(bestMatch.textContent).length
    ) {
      bestMatch = node
    }
  }

  return bestMatch
}

export async function clickReviewEntryPoints() {
  const selector = await getReviewsButtonSelector()

  if (selector) {
    const target = document.querySelector(selector)

    if (target) {
      target.scrollIntoView({ block: "center", behavior: "instant" })
      await sleep(400)
      target.click()
      return true
    }

    setStatus(`Reviews button not found: ${selector}`)
  }

  const seeAllButton = findSeeAllReviewsButton()

  if (seeAllButton) {
    seeAllButton.scrollIntoView({ block: "center", behavior: "instant" })
    await sleep(400)
    seeAllButton.click()
    return true
  }

  return false
}

export function findReviewsDialog() {
  for (const dialog of document.querySelectorAll('[role="dialog"][aria-modal="true"]')) {
    const titleNode =
      dialog.querySelector("._39vL3TE4") ||
      Array.from(dialog.querySelectorAll("div")).find(
        (node) => normalizeText(node.textContent) === "Item reviews",
      )

    if (titleNode) {
      return dialog
    }
  }

  return null
}

function findScrollContainerInDialog(dialog) {
  if (!dialog) return null

  const dataScroll = dialog.querySelector('[data-scroll="true"]')
  if (dataScroll) {
    return dataScroll
  }

  const scrollable = Array.from(dialog.querySelectorAll("*")).find((node) => {
    const style = window.getComputedStyle(node)
    return (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 40
    )
  })

  return scrollable || null
}

export function findScrollContainer() {
  if (state.scrollContainer?.isConnected) {
    return state.scrollContainer
  }

  const dialog = findReviewsDialog()
  const inDialog = findScrollContainerInDialog(dialog)
  if (inDialog) {
    state.scrollContainer = inDialog
    return inDialog
  }

  const modal =
    document.querySelector('[role="dialog"]') ||
    document.querySelector(".modal") ||
    document.querySelector('[class*="review"]')

  if (modal) {
    const scrollable = findScrollContainerInDialog(modal)
    if (scrollable) {
      state.scrollContainer = scrollable
      return scrollable
    }
  }

  return document.scrollingElement || document.documentElement
}

export async function waitForReviewsDialog(timeoutMs = DIALOG_WAIT_MS) {
  const existing = findReviewsDialog()
  if (existing) {
    state.scrollContainer = findScrollContainerInDialog(existing)
    return existing
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (dialog) => {
      if (settled) return
      settled = true
      observer.disconnect()
      clearTimeout(timer)
      if (dialog) {
        state.scrollContainer = findScrollContainerInDialog(dialog)
      }
      resolve(dialog)
    }

    const observer = new MutationObserver(() => {
      const dialog = findReviewsDialog()
      if (dialog) {
        finish(dialog)
      }
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    const timer = setTimeout(() => {
      finish(findReviewsDialog())
    }, timeoutMs)
  })
}

export function scrollReviewsPanel() {
  const container = findScrollContainer()
  if (!container) return

  const previousTop = container.scrollTop
  const step = Math.max(container.clientHeight * 0.85, 320)
  container.scrollTop = Math.min(container.scrollTop + step, container.scrollHeight)

  if (container.scrollTop === previousTop) {
    container.scrollTop = container.scrollHeight
  }
}

export function shouldStopCollecting(limit, filter = getImportFilter()) {
  const collected = state.reviews.size

  if (limit && collected >= limit) {
    return true
  }

  if (filter === "withText") {
    return false
  }

  if (state.maxListSize && collected >= state.maxListSize) {
    return true
  }

  return false
}

function isPhotosVideosLabel(text) {
  return /^Photos\/Videos/i.test(normalizeText(text))
}

export function findPhotosVideosTab(dialog = findReviewsDialog()) {
  if (!dialog) {
    return null
  }

  for (const node of dialog.querySelectorAll("div._3bWZAd8u._3j_gBgpF, div._3bWZAd8u")) {
    if (!isPhotosVideosLabel(node.textContent)) {
      continue
    }

    return node.closest('[role="button"]') || node
  }

  for (const span of dialog.querySelectorAll("span")) {
    if (!isPhotosVideosLabel(span.textContent)) {
      continue
    }

    return (
      span.closest('[role="button"]') ||
      span.closest("div._3bWZAd8u") ||
      span.parentElement
    )
  }

  return null
}

export async function waitForPhotosVideosTab(dialog, timeoutMs = 3000) {
  const existing = findPhotosVideosTab(dialog)
  if (existing) {
    return existing
  }

  return new Promise((resolve) => {
    let settled = false
    const root = dialog || findReviewsDialog()

    const finish = (tab) => {
      if (settled) return
      settled = true
      observer.disconnect()
      clearTimeout(timer)
      resolve(tab || null)
    }

    const observer = new MutationObserver(() => {
      const tab = findPhotosVideosTab(dialog)
      if (tab) {
        finish(tab)
      }
    })

    observer.observe(root || document.documentElement, {
      childList: true,
      subtree: true,
    })

    const timer = setTimeout(() => {
      finish(findPhotosVideosTab(dialog))
    }, timeoutMs)
  })
}

export async function activatePhotosVideosTab(dialog) {
  const tab = await waitForPhotosVideosTab(dialog, 3000)
  if (!tab) {
    return false
  }

  tab.scrollIntoView({ block: "center", behavior: "instant" })
  await sleep(400)
  tab.click()
  await sleep(1200)

  state.scrollContainer = null
  const refreshedDialog = findReviewsDialog()
  if (refreshedDialog) {
    state.scrollContainer = findScrollContainerInDialog(refreshedDialog)
  }

  return true
}