import { MESSAGE_TYPE, extractGoodsId, state } from "./temu-shared.js"
import { createPanel } from "./temu-panel.js"
import { ingestPayload } from "./temu-scraper.js"
import { startImport, stopImport } from "./temu-import.js"

window.addEventListener("message", (event) => {
  if (event.source !== window) return
  if (event.data?.source !== "revora-extension") return
  if (event.data?.type !== MESSAGE_TYPE) return
  if (!state.collecting) return

  ingestPayload(event.data.payload)
})

if (extractGoodsId()) {
  createPanel(startImport, stopImport)
} else {
  const observer = new MutationObserver(() => {
    if (extractGoodsId()) {
      createPanel(startImport, stopImport)
      observer.disconnect()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}