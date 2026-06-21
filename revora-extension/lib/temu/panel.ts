import type {
  BackgroundProductsResponse,
  BackgroundVerifyResponse,
} from "@revora/shared/extension-messages"
import type { ImportFilter, ShopifyProductSummary } from "@revora/shared/extension-types"
import { REVORA_THEME } from "../theme"
import {
  PANEL_ID,
  extractGoodsId,
  panelRef,
  sendRuntimeMessage,
  state,
  $,
} from "./shared"

export function createPanel(
  onStart: () => void | Promise<void>,
  onStop: (reason: string) => void,
) {
  if (document.getElementById(PANEL_ID)) {
    return
  }

  const host = document.createElement("div")
  host.id = PANEL_ID
  panelRef.shadow = host.attachShadow({ mode: "open" })
  panelRef.shadow.innerHTML = `
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
        width: 300px;
        max-height: 70vh;
        overflow: auto;
        color: ${REVORA_THEME.text};
        background: ${REVORA_THEME.surface};
        border: 1px solid ${REVORA_THEME.border};
        border-radius: 14px;
        box-shadow: 0 10px 28px rgba(251, 119, 1, 0.18);
        padding: 14px;
        font-size: 12px;
        line-height: 1.4;
      }

      .panel.collapsed {
        width: auto;
        max-height: none;
        overflow: visible;
        padding: 8px 12px;
        cursor: pointer;
        background: linear-gradient(180deg, ${REVORA_THEME.orangeLight}, ${REVORA_THEME.surface});
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }

      .title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
        margin: 0;
        color: ${REVORA_THEME.orangeDark};
      }

      .icon-btn {
        width: 26px;
        height: 26px;
        border: 1px solid ${REVORA_THEME.border};
        border-radius: 8px;
        background: ${REVORA_THEME.orangeLight};
        color: ${REVORA_THEME.orangeDark};
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        flex-shrink: 0;
      }

      .muted {
        color: ${REVORA_THEME.textMuted};
        font-size: 11px;
        margin-bottom: 10px;
      }

      label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 4px;
        color: ${REVORA_THEME.text};
      }

      select,
      button.action {
        width: 100%;
        margin-bottom: 8px;
        font-size: 12px;
        line-height: 1.3;
      }

      select {
        height: 34px;
        padding: 0 10px;
        border-radius: 10px;
        border: 1px solid ${REVORA_THEME.border};
        background: #fff;
        color: ${REVORA_THEME.text};
      }

      button.action {
        border: 0;
        border-radius: 10px;
        padding: 9px 12px;
        background: ${REVORA_THEME.orange};
        color: #fff;
        cursor: pointer;
        font-weight: 700;
      }

      button.action:hover:not(:disabled) {
        background: ${REVORA_THEME.orangeDark};
      }

      button.action.secondary {
        background: #fff;
        color: ${REVORA_THEME.orangeDark};
        border: 1px solid ${REVORA_THEME.border};
      }

      button.action:disabled,
      .icon-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .setup.is-complete {
        opacity: 0.55;
        pointer-events: none;
      }

      .progress {
        height: 7px;
        background: ${REVORA_THEME.orangeLight};
        border-radius: 999px;
        overflow: hidden;
        margin: 8px 0;
      }

      .progress > span {
        display: block;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, ${REVORA_THEME.orange}, ${REVORA_THEME.orangeDark});
        transition: width 0.2s ease;
      }

      .panel.is-complete .progress > span {
        background: ${REVORA_THEME.success};
      }

      .result-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
        padding: 12px;
        border-radius: 12px;
        background: #ecfdf3;
        border: 1px solid #b7ebd0;
      }

      .result-icon {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${REVORA_THEME.success};
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 800;
        flex-shrink: 0;
      }

      .result-title {
        font-size: 13px;
        font-weight: 700;
        color: #0b6e40;
        margin-bottom: 2px;
      }

      .result-detail {
        font-size: 11px;
        color: #166534;
        line-height: 1.4;
      }

      .status {
        font-size: 11px;
        color: ${REVORA_THEME.textMuted};
        min-height: 16px;
        margin-bottom: 8px;
        word-break: break-word;
      }

      .panel.is-running .status {
        color: ${REVORA_THEME.orangeDark};
        font-weight: 600;
      }

      .row {
        display: flex;
        gap: 8px;
      }

      .row button.action {
        flex: 1;
        margin-bottom: 0;
      }

      .collapsed-label {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        color: ${REVORA_THEME.orangeDark};
      }
    </style>
    <div class="panel" id="revora-panel-body">
      <div class="header">
        <div class="title-wrap">
          <h3 class="title">Revora</h3>
        </div>
        <button class="icon-btn" id="revora-toggle-btn" type="button" title="Minimize">–</button>
      </div>
      <div id="revora-panel-content">
        <div class="setup" id="revora-setup-section">
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
        </div>
        <div class="activity" id="revora-activity-section">
          <div class="result-banner" id="revora-result-banner" hidden>
            <div class="result-icon" aria-hidden="true">✓</div>
            <div>
              <div class="result-title" id="revora-result-title">Import complete</div>
              <div class="result-detail" id="revora-result-detail"></div>
            </div>
          </div>
          <div class="progress" id="revora-progress-wrap">
            <span id="revora-progress-bar"></span>
          </div>
          <div class="status" id="revora-status">Connect the extension from the popup to begin.</div>
          <div class="row">
            <button class="action" id="revora-start-btn" type="button">Import reviews</button>
            <button class="action secondary" id="revora-stop-btn" type="button" disabled>Stop</button>
          </div>
        </div>
      </div>
    </div>
  `

  document.documentElement.appendChild(host)

  $("revora-start-btn")?.addEventListener("click", () => {
    void onStart()
  })
  $("revora-stop-btn")?.addEventListener("click", () => {
    onStop("Stopped by user")
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

export function togglePanelCollapsed(forceCollapsed?: boolean) {
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

export function setStatus(text: string) {
  const node = $("revora-status")
  if (!node) return
  node.hidden = !text
  node.textContent = text
}

export function setProgress(current: number, total: number) {
  const bar = $("revora-progress-bar")
  if (!bar) return

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  bar.style.width = `${pct}%`
}

export function setButtons(collecting: boolean, complete = false) {
  const start = $("revora-start-btn")
  const stop = $("revora-stop-btn")
  if (start instanceof HTMLButtonElement) {
    start.disabled = collecting
    start.textContent = complete
      ? "Import again"
      : collecting
        ? "Importing..."
        : "Import reviews"
  }
  if (stop instanceof HTMLButtonElement) {
    stop.disabled = !collecting
    stop.hidden = complete || !collecting
  }
}

function updateCollapsedLabel(text: string) {
  const label = $("revora-panel-body")?.querySelector(".collapsed-label")
  if (label) {
    label.textContent = text
  }
}

export function setImportRunning() {
  const panel = $("revora-panel-body")
  const setup = $("revora-setup-section")
  const progressWrap = $("revora-progress-wrap")
  const resultBanner = $("revora-result-banner")

  panel?.classList.add("is-running")
  panel?.classList.remove("is-complete")
  setup?.classList.remove("is-complete")
  progressWrap?.removeAttribute("hidden")
  resultBanner?.setAttribute("hidden", "")
  setButtons(true)
  updateCollapsedLabel("Importing...")
}

export function setImportComplete({
  count,
  filterLabel,
  productTitle,
}: {
  count: number
  filterLabel: string
  productTitle: string
}) {
  const panel = $("revora-panel-body")
  const setup = $("revora-setup-section")
  const progressWrap = $("revora-progress-wrap")
  const resultBanner = $("revora-result-banner")
  const resultDetail = $("revora-result-detail")

  panel?.classList.remove("is-running")
  panel?.classList.add("is-complete")
  setup?.classList.add("is-complete")
  progressWrap?.setAttribute("hidden", "")
  resultBanner?.removeAttribute("hidden")
  setProgress(count, count)
  setStatus("")

  if (resultDetail) {
    resultDetail.textContent = `${count} reviews ${filterLabel} added to ${productTitle}.`
  }

  setButtons(false, true)
  updateCollapsedLabel(`Done · ${count} reviews`)
}

export function clearImportResult() {
  const panel = $("revora-panel-body")
  const setup = $("revora-setup-section")
  const progressWrap = $("revora-progress-wrap")
  const resultBanner = $("revora-result-banner")

  panel?.classList.remove("is-running", "is-complete")
  setup?.classList.remove("is-complete")
  progressWrap?.removeAttribute("hidden")
  resultBanner?.setAttribute("hidden", "")
  setProgress(0, 0)
  setButtons(false)
  updateCollapsedLabel("Revora")
}

function renderProducts(
  products: ShopifyProductSummary[],
  selectedId = getSelectedProduct().id,
) {
  const select = $("revora-product-select")
  if (!select) return

  select.innerHTML =
    `<option value="">Select a Shopify product</option>` +
    products
      .map(
        (product) =>
          `<option value="${escapeHtml(product.id)}" data-title="${escapeHtml(product.title)}"${product.id === selectedId ? " selected" : ""}>${escapeHtml(product.title)}</option>`,
      )
      .join("")
}

export async function loadProducts(search = "") {
  const select = $("revora-product-select")
  if (!select) return

  const selectedId = getSelectedProduct().id
  select.innerHTML = `<option value="">Loading products...</option>`

  try {
    const productsResponse = await sendRuntimeMessage<BackgroundProductsResponse>({
      type: "REVORA_GET_PRODUCTS",
      search: search || undefined,
    })

    if (!productsResponse.ok) {
      select.innerHTML = `<option value="">Failed to load products</option>`
      setStatus(productsResponse.error || "Failed to load Shopify products")
      return
    }

    renderProducts(productsResponse.data?.products || [], selectedId)
  } catch (error) {
    select.innerHTML = `<option value="">Failed to load products</option>`
    setStatus(
      error instanceof Error ? error.message : "Failed to load Shopify products",
    )
  }
}

export async function initializePanel() {
  const goodsId = extractGoodsId()
  const label = $("revora-goods-label")

  if (goodsId && label) {
    label.textContent = `Temu product ${goodsId}`
  }

  try {
    const verify = await sendRuntimeMessage<BackgroundVerifyResponse>({
      type: "REVORA_VERIFY",
    })

    if (!verify.ok) {
      setStatus(verify.error || "Extension is not connected yet")
      return
    }

    const shop =
      verify.data?.shop ||
      verify.data?.label ||
      (await chrome.storage.sync.get(["shop"])).shop

    setStatus(shop ? `Connected to ${shop}` : "Connected")
    await loadProducts()
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Extension is not connected yet",
    )
  }
}

export function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function getSelectedProduct() {
  const select = $("revora-product-select")
  const option =
    select instanceof HTMLSelectElement ? select.selectedOptions[0] : undefined
  return {
    id: option?.value || "",
    title: option?.dataset.title || option?.textContent || "",
  }
}

export function getImportFilter(): ImportFilter {
  const filterSelect = $("revora-import-filter")
  const value =
    filterSelect instanceof HTMLSelectElement ? filterSelect.value : "all"
  if (value === "withText" || value === "withPictures") {
    return value
  }
  return "all"
}

