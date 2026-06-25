import type {
  ConnectTokenResponse,
  EnrichedConnection,
  ImportBatchResponse,
  PlanResponse,
  ProductsResponse,
  TemuReviewPayload,
  VerifyResponse,
} from "./extension-types";

export type BackgroundRequest =
  | { type: "REVORA_SET_API_URL"; apiBaseUrl: string }
  | {
      type: "REVORA_CONNECT_DIRECT";
      token: string;
      apiUrl: string;
      shop: string;
      plan?: string;
      planName?: string;
      reviewLimit?: number | null;
    }
  | { type: "REVORA_GET_PLAN" }
  | { type: "REVORA_GET_CONNECTION_STATUS" }
  | { type: "REVORA_DISCONNECT" }
  | { type: "REVORA_VERIFY" }
  | { type: "REVORA_GET_PRODUCTS"; search?: string }
  | {
      type: "REVORA_UPLOAD_BATCH";
      importId: string | null;
      temuGoodsId: string;
      temuProductUrl: string;
      temuProductTitle: string;
      shopifyProductId: string;
      shopifyProductTitle: string;
      totalExpected: number | null;
      batchIndex: number;
      isFinal: boolean;
      reviews: TemuReviewPayload[];
    };

export type BackgroundResponse<T = unknown> =
  | { ok: true; data?: T; apiBaseUrl?: string }
  | { ok: false; error: string };

export type BackgroundDirectConnectResponse =
  BackgroundResponse<ConnectTokenResponse>;
export interface ExtensionConnectionStatusData {
  paired: boolean;
  shop: string | null;
  verified: boolean;
}

export type BackgroundConnectionStatusResponse =
  BackgroundResponse<ExtensionConnectionStatusData>;

export type BackgroundPlanResponse = BackgroundResponse<PlanResponse>;
export type BackgroundVerifyResponse = BackgroundResponse<
  VerifyResponse & EnrichedConnection
>;
export type BackgroundProductsResponse = BackgroundResponse<ProductsResponse>;
export type BackgroundUploadResponse = BackgroundResponse<ImportBatchResponse>;

/**
 * Messages the background service worker broadcasts (via `chrome.runtime.sendMessage`)
 * to all extension content scripts. Distinct from {@link BackgroundRequest} (which is
 * popup/CS → background). Content scripts listen on `chrome.runtime.onMessage` and
 * forward these to the embedded app via `window.postMessage` with a pinned origin.
 */
export type BackgroundBroadcast = PairingConfirmedMessage;

export type AdminBridgeRequest =
  | { type: "REVORA_PING" }
  | { type: "REVORA_GET_CONNECT_TOKEN" }
  | { type: "REVORA_CLEAR_PAIRING" };

export interface RevoraClearConnectTokenMessage {
  type: "REVORA_CLEAR_CONNECT_TOKEN";
}

export type AdminBridgeResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; unavailable?: boolean }
  | {
      token: string | null;
      apiUrl: string | null;
      shop: string | null;
      plan: string | null;
      planName: string | null;
      reviewLimit: number | null;
    };

export interface ConnectTokenRequest {
  requestId: string;
  type: "REVORA_REQUEST_CONNECT_TOKEN";
}

export interface ConnectTokenPullResponse {
  apiUrl: string | null;
  plan: string | null;
  planName: string | null;
  requestId: string;
  reviewLimit: number | null;
  shop: string | null;
  token: string | null;
  type: "REVORA_CONNECT_TOKEN_RESPONSE";
}

export interface ConnectTokenBroadcast {
  apiUrl: string;
  plan?: string | null;
  planName?: string | null;
  reviewLimit?: number | null;
  shop: string;
  token: string;
  type: "REVORA_CONNECT_TOKEN";
}

/** Nudge admin-bridge to pull the connect token from the embedded iframe immediately. */
export interface ExtensionStatusRequest {
  requestId: string;
  type: "REVORA_REQUEST_EXTENSION_STATUS";
}

/**
 * Posted by the extension's content scripts to the embedded app (pinned
 * `targetOrigin`) immediately after the background service worker verifies a
 * freshly-minted connect token. Replaces the former `lastUsedAt` polling loop:
 * the app resolves its pairing promise on receipt — zero polling.
 */
export interface PairingConfirmedMessage {
  shop: string;
  type: "REVORA_PAIRING_CONFIRMED";
}

export interface ExtensionStatusResponse {
  installed: boolean;
  paired: boolean;
  requestId: string;
  shop: string | null;
  type: "REVORA_EXTENSION_STATUS_RESPONSE";
  verified: boolean;
}

export const TEMU_REVIEWS_MESSAGE_TYPE = "REVORA_TEMU_REVIEWS" as const;

export interface TemuReviewsMessage {
  payload: {
    reviews: TemuReviewPayload[];
    maxListSize: number | null;
    page: number | null;
    goodsId: string | null;
  };
  source: "revora-extension";
  type: typeof TEMU_REVIEWS_MESSAGE_TYPE;
  url: string;
}

export type UploadBatchMessage = Extract<
  BackgroundRequest,
  { type: "REVORA_UPLOAD_BATCH" }
>;

export function isUploadBatchMessage(
  message: BackgroundRequest
): message is UploadBatchMessage {
  return message.type === "REVORA_UPLOAD_BATCH";
}
