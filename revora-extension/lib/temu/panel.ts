import { getRevoraAdminAppUrl } from "@revora/shared";
import type {
  BackgroundProductsResponse,
  BackgroundVerifyResponse,
} from "@revora/shared/extension-messages";
import type {
  ImportFilter,
  ShopifyProductSummary,
} from "@revora/shared/extension-types";
import { getPanelStyles } from "../ui-styles";
import { $, PANEL_ID, panelRef, sendRuntimeMessage } from "./shared";

let connectedShop: string | null = null;

export function createPanel(
  onStart: () => void | Promise<void>,
  onStop: (reason: string) => void
) {
  if (document.getElementById(PANEL_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = PANEL_ID;
  panelRef.shadow = host.attachShadow({ mode: "open" });
  panelRef.shadow.innerHTML = `
    <style>${getPanelStyles()}</style>
    <div class="panel" id="revora-panel-body">
      <button class="revora-btn revora-btn--icon panel-collapse" id="revora-toggle-btn" type="button" title="Minimize">–</button>
      <div id="revora-panel-content" class="revora-stack">
        <div class="section setup" id="revora-setup-section">
          <div class="revora-field">
            <label for="revora-product-select">Shopify product</label>
            <select class="revora-select" id="revora-product-select">
              <option value="">Loading products...</option>
            </select>
          </div>
          <div class="revora-field">
            <label for="revora-import-filter">Review filter</label>
            <select class="revora-select" id="revora-import-filter">
              <option value="all">All reviews</option>
              <option value="withText">With text only</option>
              <option value="withPictures">With photos/videos only</option>
            </select>
          </div>
        </div>
        <div class="section activity" id="revora-activity-section">
          <div class="success-state" id="revora-success-state" hidden>
            <div class="revora-banner revora-banner--success">
              <p class="revora-banner__heading" id="revora-success-count">Import complete</p>
              <p class="revora-banner__body" id="revora-success-detail"></p>
            </div>
            <div class="revora-btn-group">
              <button class="revora-btn revora-btn--primary" id="revora-view-shopify-btn" type="button">
                View in Shopify
              </button>
              <button class="revora-btn revora-btn--secondary" id="revora-import-again-btn" type="button">
                Import again
              </button>
            </div>
          </div>
          <div class="working-state" id="revora-working-state">
            <div class="revora-progress" id="revora-progress-wrap">
              <span id="revora-progress-bar"></span>
            </div>
            <p class="status" id="revora-status">Connect the extension from the popup to begin.</p>
            <div class="revora-btn-group">
              <button class="revora-btn revora-btn--primary" id="revora-start-btn" type="button">Import reviews</button>
              <button class="revora-btn revora-btn--secondary" id="revora-stop-btn" type="button" disabled>Stop</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);

  $("revora-start-btn")?.addEventListener("click", () => {
    void onStart();
  });
  $("revora-stop-btn")?.addEventListener("click", () => {
    onStop("Stopped by user");
  });
  $("revora-import-again-btn")?.addEventListener("click", () => {
    clearImportResult();
    setStatus("Select a product and click Import reviews.");
  });
  $("revora-view-shopify-btn")?.addEventListener("click", () => {
    void openRevoraInShopify();
  });
  $("revora-toggle-btn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanelCollapsed();
  });
  $("revora-panel-body")?.addEventListener("click", () => {
    const panel = $("revora-panel-body");
    if (panel?.classList.contains("collapsed")) {
      togglePanelCollapsed(false);
    }
  });
  void initializePanel();
}

async function openRevoraInShopify() {
  const shop =
    connectedShop || (await chrome.storage.sync.get(["shop"])).shop || null;

  if (!shop || typeof shop !== "string") {
    setStatus("Connect the extension from the popup first.");
    return;
  }

  window.open(getRevoraAdminAppUrl(shop), "_blank", "noopener,noreferrer");
}

function setConnectedShop(shop: string | null) {
  connectedShop = shop;
}

export function togglePanelCollapsed(forceCollapsed?: boolean) {
  const panel = $("revora-panel-body");
  const content = $("revora-panel-content");
  const toggle = $("revora-toggle-btn");
  if (!(panel && content && toggle)) {
    return;
  }

  const shouldCollapse =
    typeof forceCollapsed === "boolean"
      ? forceCollapsed
      : !panel.classList.contains("collapsed");

  if (shouldCollapse) {
    panel.classList.add("collapsed");
    content.hidden = true;
    toggle.textContent = "+";
    toggle.title = "Expand";
    if (!panel.querySelector(".collapsed-label")) {
      const label = document.createElement("span");
      label.className = "collapsed-label";
      label.innerHTML = `<span class="collapsed-check" aria-hidden="true">✓</span><span>Revora</span>`;
      panel.insertBefore(label, content);
    }
    return;
  }

  panel.classList.remove("collapsed");
  content.hidden = false;
  toggle.textContent = "–";
  toggle.title = "Minimize";
  panel.querySelector(".collapsed-label")?.remove();
}

export function setStatus(text: string) {
  const node = $("revora-status");
  const working = $("revora-working-state");
  if (!(node && working)) {
    return;
  }

  working.removeAttribute("hidden");
  node.hidden = !text;
  node.textContent = text;
}

export function setProgress(current: number, total: number) {
  const bar = $("revora-progress-bar");
  if (!bar) {
    return;
  }

  const pct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  bar.style.width = `${pct}%`;
}

export function setButtons(collecting: boolean) {
  const start = $("revora-start-btn");
  const stop = $("revora-stop-btn");
  if (start instanceof HTMLButtonElement) {
    start.disabled = collecting;
    start.textContent = collecting ? "Importing..." : "Import reviews";
  }
  if (stop instanceof HTMLButtonElement) {
    stop.disabled = !collecting;
    stop.hidden = !collecting;
  }
}

function updateCollapsedLabel(text: string, showCheck = false) {
  const label = $("revora-panel-body")?.querySelector(".collapsed-label");
  if (!label) {
    return;
  }

  label.innerHTML = showCheck
    ? `<span class="collapsed-check" aria-hidden="true">✓</span><span>${escapeHtml(text)}</span>`
    : `<span>${escapeHtml(text)}</span>`;
}

export function setImportRunning() {
  const panel = $("revora-panel-body");
  const setup = $("revora-setup-section");
  const successState = $("revora-success-state");
  const workingState = $("revora-working-state");
  const progressWrap = $("revora-progress-wrap");

  panel?.classList.add("is-running");
  panel?.classList.remove("is-complete");
  setup?.classList.remove("is-complete");
  successState?.setAttribute("hidden", "");
  workingState?.removeAttribute("hidden");
  progressWrap?.removeAttribute("hidden");
  progressWrap?.classList.remove("is-complete");
  setButtons(true);
  updateCollapsedLabel("Importing...");
  togglePanelCollapsed(false);
}

export function setImportComplete({
  count,
  filterLabel,
  productTitle,
}: {
  count: number;
  filterLabel: string;
  productTitle: string;
}) {
  const panel = $("revora-panel-body");
  const setup = $("revora-setup-section");
  const successState = $("revora-success-state");
  const workingState = $("revora-working-state");
  const progressWrap = $("revora-progress-wrap");
  const successCount = $("revora-success-count");
  const successDetail = $("revora-success-detail");

  panel?.classList.remove("is-running");
  panel?.classList.add("is-complete");
  setup?.classList.add("is-complete");
  successState?.removeAttribute("hidden");
  workingState?.setAttribute("hidden", "");
  progressWrap?.classList.add("is-complete");
  setProgress(count, count);

  const reviewLabel = count === 1 ? "review" : "reviews";
  if (successCount) {
    successCount.textContent = `${count} ${reviewLabel} imported`;
  }
  if (successDetail) {
    successDetail.textContent = `${filterLabel} · ${productTitle}`;
  }

  setButtons(false);
  updateCollapsedLabel(`${count} imported`, true);
  togglePanelCollapsed(false);
}

export function clearImportResult() {
  const panel = $("revora-panel-body");
  const setup = $("revora-setup-section");
  const successState = $("revora-success-state");
  const workingState = $("revora-working-state");
  const progressWrap = $("revora-progress-wrap");

  panel?.classList.remove("is-running", "is-complete");
  setup?.classList.remove("is-complete");
  successState?.setAttribute("hidden", "");
  workingState?.removeAttribute("hidden");
  progressWrap?.removeAttribute("hidden");
  progressWrap?.classList.remove("is-complete");
  setProgress(0, 0);
  setButtons(false);
  updateCollapsedLabel("Revora");
}

function renderProducts(
  products: ShopifyProductSummary[],
  selectedId = getSelectedProduct().id
) {
  const select = $("revora-product-select");
  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">Select a Shopify product</option>` +
    products
      .map(
        (product) =>
          `<option value="${escapeHtml(product.id)}" data-title="${escapeHtml(product.title)}"${product.id === selectedId ? " selected" : ""}>${escapeHtml(product.title)}</option>`
      )
      .join("");
}

export async function loadProducts(search = "") {
  const select = $("revora-product-select");
  if (!select) {
    return;
  }

  const selectedId = getSelectedProduct().id;
  select.innerHTML = `<option value="">Loading products...</option>`;

  try {
    const productsResponse =
      await sendRuntimeMessage<BackgroundProductsResponse>({
        type: "REVORA_GET_PRODUCTS",
        search: search || undefined,
      });

    if (!productsResponse.ok) {
      select.innerHTML = `<option value="">Failed to load products</option>`;
      setStatus(productsResponse.error || "Failed to load Shopify products");
      return;
    }

    renderProducts(productsResponse.data?.products || [], selectedId);
  } catch (error) {
    select.innerHTML = `<option value="">Failed to load products</option>`;
    setStatus(
      error instanceof Error ? error.message : "Failed to load Shopify products"
    );
  }
}

export async function initializePanel() {
  try {
    const verify = await sendRuntimeMessage<BackgroundVerifyResponse>({
      type: "REVORA_VERIFY",
    });

    if (!verify.ok) {
      setConnectedShop(null);
      setStatus(verify.error || "Extension is not connected yet");
      return;
    }

    const shop =
      verify.data?.shop ||
      verify.data?.label ||
      (await chrome.storage.sync.get(["shop"])).shop;

    setConnectedShop(typeof shop === "string" && shop ? shop : null);
    setStatus("Choose a product and import reviews.");
    await loadProducts();
  } catch (error) {
    setConnectedShop(null);
    setStatus(
      error instanceof Error ? error.message : "Extension is not connected yet"
    );
  }
}

export function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getSelectedProduct() {
  const select = $("revora-product-select");
  const option =
    select instanceof HTMLSelectElement ? select.selectedOptions[0] : undefined;
  return {
    id: option?.value || "",
    title: option?.dataset.title || option?.textContent || "",
  };
}

export function getImportFilter(): ImportFilter {
  const filterSelect = $("revora-import-filter");
  const value =
    filterSelect instanceof HTMLSelectElement ? filterSelect.value : "all";
  if (value === "withText" || value === "withPictures") {
    return value;
  }
  return "all";
}
