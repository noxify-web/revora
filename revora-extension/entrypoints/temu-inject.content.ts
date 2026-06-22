import { TEMU_REVIEWS_API_PATH } from "@revora/shared/constants";
import { TEMU_REVIEWS_MESSAGE_TYPE } from "@revora/shared/extension-messages";
import type { TemuReviewPayload } from "@revora/shared/extension-types";

export default defineContentScript({
  matches: ["*://*.temu.com/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    function publish(
      url: string,
      payload: {
        reviews: TemuReviewPayload[];
        maxListSize: number | null;
        page: number | null;
        goodsId: string | null;
      }
    ) {
      window.postMessage(
        {
          source: "revora-extension",
          type: TEMU_REVIEWS_MESSAGE_TYPE,
          url,
          payload,
        },
        "*"
      );
    }

    function extractPage(url: string) {
      try {
        return Number(
          new URL(url, window.location.origin).searchParams.get("page") || "1"
        );
      } catch {
        return null;
      }
    }

    function extractGoodsId(url: string) {
      try {
        return new URL(url, window.location.origin).searchParams.get(
          "goods_id"
        );
      } catch {
        return null;
      }
    }

    function handleReviewsResponse(
      url: string,
      data: { data?: TemuReviewPayload[]; max_list_size?: number | null }
    ) {
      if (!(data && Array.isArray(data.data))) {
        return;
      }

      publish(url, {
        reviews: data.data,
        maxListSize: data.max_list_size ?? null,
        page: extractPage(url),
        goodsId: extractGoodsId(url),
      });
    }

    function isReviewsEndpoint(url: string) {
      return typeof url === "string" && url.includes(TEMU_REVIEWS_API_PATH);
    }

    const originalFetch = window.fetch;
    window.fetch = async function fetchInterceptor(...args) {
      const response = await originalFetch.apply(this, args);
      let requestUrl = "";
      if (typeof args[0] === "string") {
        requestUrl = args[0];
      } else if (args[0] instanceof Request) {
        requestUrl = args[0].url;
      }

      if (isReviewsEndpoint(requestUrl)) {
        response
          .clone()
          .json()
          .then((data) => handleReviewsResponse(requestUrl, data))
          .catch(() => {
            // Ignore malformed review payloads from intercepted fetches.
          });
      }

      return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function openInterceptor(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      this.__revoraUrl = String(url);
      return originalOpen.call(
        this,
        method,
        url,
        async ?? true,
        username,
        password
      );
    };

    XMLHttpRequest.prototype.send = function sendInterceptor(
      ...args: [Document | XMLHttpRequestBodyInit | null | undefined]
    ) {
      this.addEventListener("load", function onLoad() {
        const url = this.__revoraUrl;
        if (
          !(url && isReviewsEndpoint(url)) ||
          this.responseType === "arraybuffer"
        ) {
          return;
        }

        try {
          const data =
            typeof this.response === "string"
              ? JSON.parse(this.response)
              : this.response;
          handleReviewsResponse(url, data);
        } catch {
          // Ignore malformed responses.
        }
      });

      return originalSend.apply(this, args);
    };
  },
});
