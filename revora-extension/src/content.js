const PANEL_ID = "revora-import-panel"
const MESSAGE_TYPE = "REVORA_TEMU_REVIEWS"
let panelShadow = null
const BATCH_SIZE = 25
const SCROLL_INTERVAL_MS = 1200
const MAX_IDLE_ROUNDS = 15
const DIALOG_WAIT_MS = 12000

const state = {
  collecting: false,
  reviews: new Map(),
  maxListSize: null,
  lastPageSeen: 0,
  idleRounds: 0,
  importId: null,
  uploadedIds: new Set(),
  pendingUpload: [],
  scrollContainer: null,
}

function extractGoodsId() {
  const match = window.location.pathname.match(/-g-(\d+)\.html/i)
  return match?.[1] || null
}

function getProductTitle() {
  const heading =
    document.querySelector("h1") ||
    document.querySelector('[data-type="title"]') ||
    document.querySelector("title")

  return heading?.textContent?.trim() || document.title
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

function $(id) {
  return panelShadow?.getElementById(id) ?? null
}

function createPanel() {
  if (document.getElementById(PANEL_ID)) {
    return
  }

  const host = document.createElement("div")
  host.id = PANEL_ID
  panelShadow = host.attachShadow({ mode: "open" })
  panelShadow.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .panel {
        width: 280px;
        max-height: 70vh;
        overflow: auto;
        color: #111;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
        padding: 12px;
        font-size: 12px;
        line-height: 1.4;
      }

      .panel.collapsed {
        width: auto;
        max-height: none;
        overflow: visible;
        padding: 8px 10px;
        cursor: pointer;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        margin: 0;
      }

      .icon-btn {
        width: 24px;
        height: 24px;
        border: 0;
        border-radius: 6px;
        background: #f3f3f3;
        color: #111;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        flex-shrink: 0;
      }

      .muted {
        color: #666;
        font-size: 11px;
        margin-bottom: 10px;
      }

      label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      select,
      button.action {
        width: 100%;
        margin-bottom: 8px;
        font-size: 12px;
        line-height: 1.3;
      }

      select {
        height: 32px;
        padding: 0 8px;
        border-radius: 6px;
        border: 1px solid #ccc;
        background: #fff;
        color: #111;
      }

      button.action {
        border: 0;
        border-radius: 6px;
        padding: 8px 10px;
        background: #111;
        color: #fff;
        cursor: pointer;
        font-weight: 600;
      }

      button.action.secondary {
        background: #f3f3f3;
        color: #111;
      }

      button.action:disabled,
      .icon-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .progress {
        height: 6px;
        background: #eee;
        border-radius: 999px;
        overflow: hidden;
        margin: 6px 0;
      }

      .progress > span {
        display: block;
        height: 100%;
        width: 0%;
        background: #2f9e44;
        transition: width 0.2s ease;
      }

      .status {
        font-size: 11px;
        color: #444;
        min-height: 28px;
        margin-bottom: 8px;
        word-break: break-word;
      }

      .row {
        display: flex;
        gap: 6px;
      }

      .row button.action {
        flex: 1;
        margin-bottom: 0;
      }

      .collapsed-label {
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
    </style>
    <div class="panel" id="revora-panel-body">
      <div class="header">
        <h3 class="title">Revora</h3>
        <button class="icon-btn" id="revora-toggle-btn" type="button" title="Minimize">–</button>
      </div>
      <div id="revora-panel-content">
        <div class="muted" id="revora-goods-label">Waiting for Temu product page...</div>
        <label for="revora-product-select">Shopify product</label>
        <select id="revora-product-select">
          <option value="">Loading products...</option>
        </select>
        <label for="revora-import-filter">Review filter</label>
        <select id="revora-import-filter">
          <option value="all">All reviews</option>
          <option value="withText">With text only</option>
          <option value="withPictures">With photos/videos only</option>
        </select>
        <label for="revora-import-limit">Import limit</label>
        <select id="revora-import-limit">
          <option value="all">No limit</option>
          <option value="latest100">Latest 100</option>
        </select>
        <div class="progress"><span id="revora-progress-bar"></span></div>
        <div class="status" id="revora-status">Pair the extension from the popup to begin.</div>
        <div class="row">
          <button class="action" id="revora-start-btn" type="button">Import reviews</button>
          <button class="action secondary" id="revora-stop-btn" type="button" disabled>Stop</button>
        </div>
      </div>
    </div>
  `

  document.documentElement.appendChild(host)

  $("revora-start-btn")?.addEventListener("click", () => {
    void startImport()
  })
  $("revora-stop-btn")?.addEventListener("click", () => {
    stopImport("Stopped by user")
  })
  $("revora-toggle-btn")?.addEventListener("click", (event) => {
    event.stopPropagation()
    togglePanelCollapsed()
  })
  $("revora-panel-body")?.addEventListener("click", () => {
    const panel = $("revora-panel-body")
    if (panel?.classList.contains("collapsed")) {
      togglePanelCollapsed(false)
    }
  })

  void initializePanel()
}

function togglePanelCollapsed(forceCollapsed) {
  const panel = $("revora-panel-body")
  const content = $("revora-panel-content")
  const toggle = $("revora-toggle-btn")
  if (!panel || !content || !toggle) return

  const shouldCollapse =
    typeof forceCollapsed === "boolean"
      ? forceCollapsed
      : !panel.classList.contains("collapsed")

  if (shouldCollapse) {
    panel.classList.add("collapsed")
    content.hidden = true
    toggle.textContent = "+"
    toggle.title = "Expand"
    if (!panel.querySelector(".collapsed-label")) {
      const label = document.createElement("span")
      label.className = "collapsed-label"
      label.textContent = "Revora"
      panel.insertBefore(label, content)
    }
    return
  }

  panel.classList.remove("collapsed")
  content.hidden = false
  toggle.textContent = "–"
  toggle.title = "Minimize"
  panel.querySelector(".collapsed-label")?.remove()
}

function setStatus(text) {
  const node = $("revora-status")
  if (node) node.textContent = text
}

function setProgress(current, total) {
  const bar = $("revora-progress-bar")
  if (!bar) return

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  bar.style.width = `${pct}%`
}

function setButtons(collecting) {
  const start = $("revora-start-btn")
  const stop = $("revora-stop-btn")
  if (start) start.disabled = collecting
  if (stop) stop.disabled = !collecting
}

async function initializePanel() {
  const goodsId = extractGoodsId()
  const label = $("revora-goods-label")

  if (goodsId && label) {
    label.textContent = `Temu product ${goodsId}`
  }

  const verify = await sendMessage({ type: "REVORA_VERIFY" })
  if (!verify?.ok) {
    setStatus(verify?.error || "Extension is not paired yet")
    return
  }

  setStatus(`Paired with ${verify.data.shop}`)

  const productsResponse = await sendMessage({ type: "REVORA_GET_PRODUCTS" })
  const select = $("revora-product-select")

  if (!select) return

  select.innerHTML = ""

  if (!productsResponse?.ok) {
    select.innerHTML = `<option value="">Failed to load products</option>`
    setStatus(productsResponse?.error || "Failed to load Shopify products")
    return
  }

  const products = productsResponse.data.products || []
  select.innerHTML =
    `<option value="">Select a Shopify product</option>` +
    products
      .map(
        (product) =>
          `<option value="${product.id}" data-title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</option>`,
      )
      .join("")
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function getSelectedProduct() {
  const select = $("revora-product-select")
  const option = select?.selectedOptions?.[0]
  return {
    id: option?.value || "",
    title: option?.dataset?.title || option?.textContent || "",
  }
}

function getImportFilter() {
  return $("revora-import-filter")?.value || "all"
}

function getImportLimit() {
  const mode = $("revora-import-limit")?.value || "all"
  return mode === "latest100" ? 100 : null
}

function getFilterLabel(filter) {
  if (filter === "withText") return "with text"
  if (filter === "withPictures") return "with photos/videos"
  return "reviews"
}

function reviewHasText(review) {
  const comment = (review.comment || "").trim()
  const translated = (review.review_lang?.translate_comment || "").trim()
  return comment.length > 0 || translated.length > 0
}

function reviewHasPictures(review) {
  return Array.isArray(review.pictures) && review.pictures.length > 0
}

function reviewMatchesFilter(review, filter = getImportFilter()) {
  if (filter === "withText") {
    return reviewHasText(review)
  }

  if (filter === "withPictures") {
    return reviewHasPictures(review)
  }

  return true
}

function resetCollection() {
  state.reviews.clear()
  state.maxListSize = null
  state.lastPageSeen = 0
  state.idleRounds = 0
  state.importId = null
  state.uploadedIds.clear()
  state.pendingUpload = []
  state.scrollContainer = null
}

function ingestPayload(payload) {
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
  const total = state.maxListSize || state.reviews.size
  setProgress(state.reviews.size, total)
  setStatus(
    `Collected ${state.reviews.size}${state.maxListSize ? ` / ${state.maxListSize}` : ""} ${label}`,
  )
}

async function flushUploads({ final = false, product, goodsId } = {}) {
  const allReviews = Array.from(state.reviews.values()).filter(
    (review) => !state.uploadedIds.has(String(review.review_id)),
  )

  if (!allReviews.length && !final) {
    return
  }

  const chunks = []
  for (let i = 0; i < allReviews.length; i += BATCH_SIZE) {
    chunks.push(allReviews.slice(i, i + BATCH_SIZE))
  }

  if (!chunks.length && final) {
    chunks.push([])
  }

  let batchIndex = 0
  for (const chunk of chunks) {
    const response = await sendMessage({
      type: "REVORA_UPLOAD_BATCH",
      importId: state.importId,
      temuGoodsId: goodsId,
      temuProductUrl: window.location.href,
      temuProductTitle: getProductTitle(),
      shopifyProductId: product.id,
      shopifyProductTitle: product.title,
      totalExpected: state.maxListSize,
      batchIndex,
      isFinal: final && batchIndex === chunks.length - 1,
      reviews: chunk,
    })

    if (!response?.ok) {
      throw new Error(response?.error || "Upload failed")
    }

    state.importId = response.data.importId

    for (const review of chunk) {
      state.uploadedIds.add(String(review.review_id))
    }

    setStatus(
      `Uploaded ${state.uploadedIds.size}${state.maxListSize ? ` / ${state.maxListSize}` : ""} reviews`,
    )
    batchIndex += 1
  }
}

function resolveReviewsSelector(input) {
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

async function getReviewsButtonSelector() {
  const stored = await chrome.storage.sync.get(["temuAllReviewsSelector"])
  return resolveReviewsSelector(stored.temuAllReviewsSelector)
}

function normalizeText(value) {
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

function findSeeAllReviewsButton() {
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

async function clickReviewEntryPoints() {
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

function findReviewsDialog() {
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

function findScrollContainer() {
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

async function waitForReviewsDialog(timeoutMs = DIALOG_WAIT_MS) {
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

function scrollReviewsPanel() {
  const container = findScrollContainer()
  if (!container) return

  const previousTop = container.scrollTop
  const step = Math.max(container.clientHeight * 0.85, 320)
  container.scrollTop = Math.min(container.scrollTop + step, container.scrollHeight)

  if (container.scrollTop === previousTop) {
    container.scrollTop = container.scrollHeight
  }
}

function shouldStopCollecting(limit, filter = getImportFilter()) {
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

function findPhotosVideosTab(dialog = findReviewsDialog()) {
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

async function waitForPhotosVideosTab(dialog, timeoutMs = 3000) {
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

async function activatePhotosVideosTab(dialog) {
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

async function startImport() {
  if (state.collecting) return

  const goodsId = extractGoodsId()
  if (!goodsId) {
    setStatus("Open a Temu product page first")
    return
  }

  const product = getSelectedProduct()
  if (!product.id) {
    setStatus("Select a Shopify product before importing")
    return
  }

  const verify = await sendMessage({ type: "REVORA_VERIFY" })
  if (!verify?.ok) {
    setStatus(verify?.error || "Extension is not paired")
    return
  }

  resetCollection()
  state.collecting = true
  setButtons(true)
  setStatus("Opening reviews and collecting...")

  const opened = await clickReviewEntryPoints()
  setStatus(opened ? "Waiting for reviews panel..." : "Looking for an open reviews panel...")

  const dialog = await waitForReviewsDialog(opened ? DIALOG_WAIT_MS : 2500)
  if (!dialog) {
    setStatus(
      opened
        ? "Reviews panel did not open. Click 'See all reviews' on Temu, then click Import again."
        : "Could not find reviews panel. Click 'See all reviews' on Temu, or set the button selector in the extension popup.",
    )
  } else if (!state.scrollContainer) {
    setStatus("Reviews panel open, but scroll area not found yet...")
  } else {
    setStatus("Reviews panel open — collecting...")
  }

  await sleep(800)

  const filter = getImportFilter()
  const limit = getImportLimit()
  const filterLabel = getFilterLabel(filter)
  const idleRoundsLimit = filter === "withText" ? 20 : MAX_IDLE_ROUNDS

  if (filter === "withPictures" && dialog) {
    setStatus("Opening Photos/Videos tab...")
    const openedPhotosTab = await activatePhotosVideosTab(dialog)

    if (!openedPhotosTab) {
      setStatus(
        "Photos/Videos tab not found — collecting all reviews and keeping ones with media...",
      )
    } else {
      setStatus("Photos/Videos tab open — collecting...")
    }
  }

  while (state.collecting) {
    scrollReviewsPanel()

    await sleep(SCROLL_INTERVAL_MS)

    if (shouldStopCollecting(limit, filter)) {
      break
    }

    state.idleRounds += 1
    if (state.idleRounds >= idleRoundsLimit) {
      break
    }
  }

  try {
    if (state.reviews.size === 0) {
      setStatus(
        filter === "all"
          ? "No reviews captured yet. Open the full reviews panel on Temu, then click Import again."
          : `No reviews ${filterLabel} captured yet. Try a different filter or scroll the panel manually first.`,
      )
      return
    }

    setStatus(`Uploading ${state.reviews.size} reviews ${filterLabel}...`)
    await flushUploads({ final: true, product, goodsId })
    setProgress(state.uploadedIds.size, state.maxListSize || state.uploadedIds.size)
    setStatus(
      `Import complete (${state.uploadedIds.size} reviews ${filterLabel} uploaded)`,
    )
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Import failed")
  } finally {
    state.collecting = false
    setButtons(false)
  }
}

function stopImport(reason) {
  state.collecting = false
  setButtons(false)
  setStatus(reason)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return
  if (event.data?.source !== "revora-extension") return
  if (event.data?.type !== MESSAGE_TYPE) return
  if (!state.collecting) return

  ingestPayload(event.data.payload)
})

if (extractGoodsId()) {
  createPanel()
} else {
  const observer = new MutationObserver(() => {
    if (extractGoodsId()) {
      createPanel()
      observer.disconnect()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}