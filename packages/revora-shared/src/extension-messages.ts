import type {
  ConnectExchangeResponse,
  EnrichedConnection,
  ImportBatchRequest,
  ImportBatchResponse,
  PlanResponse,
  ProductsResponse,
  TemuReviewPayload,
  VerifyResponse,
} from "./extension-types"

export type BackgroundRequest =
  | { type: "REVORA_SET_API_URL"; apiBaseUrl: string }
  | { type: "REVORA_CONNECT_EXCHANGE"; code: string }
  | { type: "REVORA_GET_PLAN" }
  | { type: "REVORA_VERIFY" }
  | { type: "REVORA_GET_PRODUCTS"; search?: string }
  | {
      type: "REVORA_UPLOAD_BATCH"
      importId: string | null
      temuGoodsId: string
      temuProductUrl: string
      temuProductTitle: string
      shopifyProductId: string
      shopifyProductTitle: string
      totalExpected: number | null
      batchIndex: number
      isFinal: boolean
      reviews: TemuReviewPayload[]
    }

export type BackgroundResponse<T = unknown> =
  | { ok: true; data?: T; apiBaseUrl?: string }
  | { ok: false; error: string }

export type BackgroundConnectResponse = BackgroundResponse<ConnectExchangeResponse>
export type BackgroundPlanResponse = BackgroundResponse<PlanResponse>
export type BackgroundVerifyResponse = BackgroundResponse<VerifyResponse & EnrichedConnection>
export type BackgroundProductsResponse = BackgroundResponse<ProductsResponse>
export type BackgroundUploadResponse = BackgroundResponse<ImportBatchResponse>

export type AdminBridgeRequest =
  | { type: "REVORA_PING" }
  | {
      type: "REVORA_ADMIN_PROXY"
      path: string
      method?: string
      body?: unknown
      headers?: Record<string, string>
    }
  | { type: "REVORA_GET_API_URL" }
  | { type: "REVORA_GET_CONNECT_CODE" }

export type AdminBridgeResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; unavailable?: boolean }
  | { apiBaseUrl: string | null }
  | {
      code: string | null
      apiUrl: string | null
      expiresAt: string | null
    }

export type AdminProxyRequest = {
  type: "REVORA_ADMIN_PROXY_REQUEST"
  requestId: string
  path: string
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export type AdminProxyResponse = {
  type: "REVORA_ADMIN_PROXY_RESPONSE"
  requestId: string
  ok: boolean
  status?: number
  data?: unknown
  error?: string
}

export type ConnectCodeRequest = {
  type: "REVORA_REQUEST_CONNECT_CODE"
  requestId: string
}

export type ConnectCodeResponse = {
  type: "REVORA_CONNECT_CODE_RESPONSE"
  requestId: string
  code: string | null
  apiUrl: string | null
  expiresAt: string | null
}

export type ConnectCodeBroadcast = {
  type: "REVORA_CONNECT_CODE"
  code: string
  apiUrl?: string | null
  expiresAt?: string | null
}

export const TEMU_REVIEWS_MESSAGE_TYPE = "REVORA_TEMU_REVIEWS" as const

export type TemuReviewsMessage = {
  source: "revora-extension"
  type: typeof TEMU_REVIEWS_MESSAGE_TYPE
  url: string
  payload: {
    reviews: TemuReviewPayload[]
    maxListSize: number | null
    page: number | null
    goodsId: string | null
  }
}

export type UploadBatchMessage = Extract<
  BackgroundRequest,
  { type: "REVORA_UPLOAD_BATCH" }
>

export function isUploadBatchMessage(
  message: BackgroundRequest,
): message is UploadBatchMessage {
  return message.type === "REVORA_UPLOAD_BATCH"
}