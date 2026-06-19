import { REVORA_THEME } from "./theme.js"
import {
  PANEL_ID,
  extractGoodsId,
  panelRef,
  sendMessage,
  state,
  $,
} from "./temu-shared.js"

export function createPanel(onStart, onStop) {
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

      .plan-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: ${REVORA_THEME.orange};
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        white-space: nowrap;
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

      .plan-note {
        margin-bottom: 10px;
        padding: 8px 10px;
        border-radius: 10px;
        background: ${REVORA_THEME.orangeLight};
        border: 1px solid ${REVORA_THEME.orangeMuted};
        color: ${REVORA_THEME.orangeDark};
        font-size: 11px;
        font-weight: 600;
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

      .status {
        font-size: 11px;
        color: ${REVORA_THEME.textMuted};
        min-height: 28px;
        margin-bottom: 8px;
        word-break: break-word;
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
          <span class="plan-badge" id="revora-plan-badge">Free</span>
        </div>
        <button class="icon-btn" id="revora-toggle-btn" type="button" title="Minimize">–</button>
      </div>
      <div id="revora-panel-content">
        <div class="muted" id="revora-goods-label">Waiting for Temu product page...</div>
        <div class="plan-note" id="revora-plan-note">Free plan: up to 100 reviews per import.</div>
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
        <div class="progress"><span id="revora-progress-bar"></span></div>
        <div class="status" id="revora-status">Connect the extension from the popup to begin.</div>
        <div class="row">
          <button class="action" id="revora-start-btn" type="button">Import reviews</button>
          <button class="action secondary" id="revora-stop-btn" type="button" disabled>Stop</button>
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

export function togglePanelCollapsed(forceCollapsed) {
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

export function setStatus(text) {
  const node = $("revora-status")
  if (node) node.textContent = text
}

export function setProgress(current, total) {
  const bar = $("revora-progress-bar")
  if (!bar) return

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  bar.style.width = `${pct}%`
}

export function setButtons(collecting) {
  const start = $("revora-start-btn")
  const stop = $("revora-stop-btn")
  if (start) start.disabled = collecting
  if (stop) stop.disabled = !collecting
}

export async function initializePanel() {
  const goodsId = extractGoodsId()
  const label = $("revora-goods-label")

  if (goodsId && label) {
    label.textContent = `Temu product ${goodsId}`
  }

  const verify = await sendMessage({ type: "REVORA_VERIFY" })
  if (!verify?.ok) {
    setStatus(verify?.error || "Extension is not connected yet")
    return
  }

  await refreshPlan()

  const shop =
    verify.data?.shop ||
    verify.data?.label ||
    (await chrome.storage.sync.get(["shop"])).shop

  setStatus(shop ? `Connected to ${shop}` : "Connected")

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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function getSelectedProduct() {
  const select = $("revora-product-select")
  const option = select?.selectedOptions?.[0]
  return {
    id: option?.value || "",
    title: option?.dataset?.title || option?.textContent || "",
  }
}

export function getImportFilter() {
  return $("revora-import-filter")?.value || "all"
}

export function getImportLimit() {
  return state.reviewLimit
}

export function updatePlanUI() {
  const badge = $("revora-plan-badge")
  const note = $("revora-plan-note")

  if (badge) {
    badge.textContent = state.planName
  }

  if (note) {
    note.textContent =
      state.reviewLimit == null
        ? "Premium plan: unlimited reviews per import."
        : `Free plan: up to ${state.reviewLimit} reviews per import.`
  }
}

export async function refreshPlan() {
  const planResponse = await sendMessage({ type: "REVORA_GET_PLAN" })

  if (!planResponse?.ok) {
    return false
  }

  state.plan = planResponse.data.plan || "free"
  state.planName = planResponse.data.planName || "Free"
  state.reviewLimit = planResponse.data.reviewLimit ?? 100
  updatePlanUI()
  return true
}