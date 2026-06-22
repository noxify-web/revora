import { TEMU_REVIEWS_MESSAGE_TYPE } from "@revora/shared/extension-messages";
import { startImport, stopImport } from "../lib/temu/import";
import {
  createPanel,
  getImportFilter,
  setProgress,
  setStatus,
} from "../lib/temu/panel";
import { ingestPayload } from "../lib/temu/scraper";
import { extractGoodsId, state } from "../lib/temu/shared";

export default defineContentScript({
  matches: ["*://*.temu.com/*"],
  runAt: "document_idle",
  main() {
    window.addEventListener("message", (event) => {
      if (event.source !== window) {
        return;
      }
      if (event.data?.source !== "revora-extension") {
        return;
      }
      if (event.data?.type !== TEMU_REVIEWS_MESSAGE_TYPE) {
        return;
      }
      if (!state.collecting) {
        return;
      }

      ingestPayload(
        event.data.payload,
        getImportFilter(),
        (current, total, status) => {
          setProgress(current, total);
          setStatus(status);
        }
      );
    });

    function mountPanel() {
      createPanel(startImport, stopImport);
    }

    if (extractGoodsId()) {
      mountPanel();
      return;
    }

    const observer = new MutationObserver(() => {
      if (extractGoodsId()) {
        mountPanel();
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
});
