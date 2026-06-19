import { DEFAULT_DEV_URL } from "./config.js";
import {
  enrichConnection,
  fetchRevora,
  persistApiBaseUrl,
  persistConnection,
  readConnectionState,
} from "./api-transport.js";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.sync.get(["stableDevUrl", "apiBaseUrl"]).then((stored) => {
    const updates = {};

    if (!stored.stableDevUrl) {
      updates.stableDevUrl = DEFAULT_DEV_URL;
    }

    if (!stored.apiBaseUrl) {
      updates.apiBaseUrl = DEFAULT_DEV_URL;
    }

    if (Object.keys(updates).length > 0) {
      return chrome.storage.sync.set(updates);
    }
  });
});

function mapReview(review) {
  const pictures = Array.isArray(review.pictures)
    ? review.pictures
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object" && item.url) {
            return String(item.url).trim();
          }
          return null;
        })
        .filter(Boolean)
    : [];

  return {
    temuReviewId: String(review.review_id),
    comment: review.comment || "",
    translatedComment: review.review_lang?.translate_comment || "",
    score: review.score ?? null,
    authorName: review.name || "",
    reviewTime: review.time ?? null,
    pictures,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REVORA_SET_API_URL") {
    persistApiBaseUrl(message.apiBaseUrl)
      .then((apiBaseUrl) => sendResponse({ ok: true, apiBaseUrl }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save URL",
        }),
      );
    return true;
  }

  if (message?.type === "REVORA_CONNECT_EXCHANGE") {
    fetchRevora("/api/extension/connect/exchange", {
      method: "POST",
      body: { code: message.code },
      auth: false,
    })
      .then(async (data) => {
        await persistConnection(data);
        return data;
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Connect failed",
        }),
      );
    return true;
  }

  if (message?.type === "REVORA_GET_PLAN") {
    readConnectionState()
      .then((stored) =>
        fetchRevora("/api/extension/plan").then((data) =>
          enrichConnection(data, stored),
        ),
      )
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to load plan",
        }),
      );
    return true;
  }

  if (message?.type === "REVORA_VERIFY") {
    readConnectionState()
      .then((stored) => {
        if (!stored.pairingToken) {
          throw new Error("Connect the extension from the popup first.");
        }

        return fetchRevora("/api/extension/verify").then((data) =>
          enrichConnection(data, stored),
        );
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Verification failed",
        }),
      );
    return true;
  }

  if (message?.type === "REVORA_GET_PRODUCTS") {
    const search = message.search
      ? `?search=${encodeURIComponent(message.search)}`
      : "";

    fetchRevora(`/api/products${search}`)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to load products",
        }),
      );
    return true;
  }

  if (message?.type === "REVORA_UPLOAD_BATCH") {
    const reviews = (message.reviews || []).map(mapReview);

    fetchRevora("/api/reviews/import", {
      method: "POST",
      body: {
        importId: message.importId,
        temuGoodsId: message.temuGoodsId,
        temuProductUrl: message.temuProductUrl,
        temuProductTitle: message.temuProductTitle,
        shopifyProductId: message.shopifyProductId,
        shopifyProductTitle: message.shopifyProductTitle,
        totalExpected: message.totalExpected,
        batchIndex: message.batchIndex,
        isFinal: message.isFinal,
        reviews,
      },
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Upload failed",
        }),
      );
    return true;
  }

  return false;
});
