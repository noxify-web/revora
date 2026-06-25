export interface TemuReviewPayload {
  comment?: string;
  name?: string;
  pictures?: Array<string | { url?: string }>;
  review_id: string;
  review_lang?: {
    translate_comment?: string;
  };
  score?: number;
  time?: number;
}

export interface ImportReviewInput {
  authorName?: string;
  comment?: string;
  pictures?: string[];
  reviewTime?: number | null;
  score?: number | null;
  temuReviewId: string;
  translatedComment?: string;
}

export interface ImportBatchRequest {
  batchIndex?: number;
  importId?: string;
  isFinal?: boolean;
  reviews: ImportReviewInput[];
  shopifyProductId?: string;
  shopifyProductTitle?: string;
  temuGoodsId: string;
  temuProductTitle?: string;
  temuProductUrl?: string;
  totalExpected?: number;
}

export interface ShopifyProductSummary {
  handle: string;
  id: string;
  imageUrl: string | null;
  title: string;
}

export interface ExtensionConnectPayload {
  apiUrl: string;
  plan: string;
  planName: string;
  reviewLimit: number | null;
  shop: string;
  token: string;
}

export type ConnectTokenResponse = ExtensionConnectPayload & {
  label?: string;
  createdAt?: string;
};

export interface VerifyResponse {
  /** ISO timestamp when this token expires (refreshed on each /verify). */
  expiresAt?: string | null;
  label?: string;
  paired: boolean;
  /** ISO timestamp when the extension first called /verify with this token (set server-side). */
  pairedAt?: string | null;
  shop: string;
}

export interface PlanResponse {
  plan: string;
  planName: string;
  reviewLimit: number | null;
  shop: string;
}

export interface ProductsResponse {
  products: ShopifyProductSummary[];
}

export interface ImportBatchResponse {
  importId: string;
  limitReached?: boolean;
}

export interface ConnectionState {
  apiBaseUrl: string;
  pairingToken: string;
  plan?: string;
  planName?: string;
  shop?: string;
}

export type EnrichedConnection = ConnectionState & {
  paired: boolean;
};

export type ImportFilter = "all" | "withText" | "withPictures";

export interface TemuReviewsInterceptPayload {
  goodsId: string | null;
  maxListSize: number | null;
  page: number | null;
  reviews: TemuReviewPayload[];
}

/**
 * Minimal connect-token shape persisted to sessionStorage for reload resilience
 * during pairing. Replaces the former DOM-dataset payload (DOM channel removed).
 */
export interface PendingConnectToken {
  apiUrl: string;
  shop: string;
  token: string;
}

/** Strip a trailing slash from an API base URL. */
export function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, "");
}
