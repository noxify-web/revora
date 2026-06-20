export type TemuReviewPayload = {
  review_id: string
  comment?: string
  score?: number
  name?: string
  time?: number
  pictures?: Array<string | { url?: string }>
  review_lang?: {
    translate_comment?: string
  }
}

export type ImportReviewInput = {
  temuReviewId: string
  comment?: string
  translatedComment?: string
  score?: number | null
  authorName?: string
  reviewTime?: number | null
  pictures?: string[]
}

export type ImportBatchRequest = {
  importId?: string
  temuGoodsId: string
  temuProductUrl?: string
  temuProductTitle?: string
  shopifyProductId?: string
  shopifyProductTitle?: string
  totalExpected?: number
  batchIndex?: number
  isFinal?: boolean
  reviews: ImportReviewInput[]
}

export type ShopifyProductSummary = {
  id: string
  title: string
  handle: string
  imageUrl: string | null
}

export type ConnectExchangeResponse = {
  shop: string
  apiUrl: string
  token: string
  pairingCode: string
  plan: string
  planName: string
  reviewLimit: number | null
}

export type VerifyResponse = {
  shop: string
  label?: string
  paired: boolean
}

export type PlanResponse = {
  shop: string
  plan: string
  planName: string
  reviewLimit: number | null
}

export type ProductsResponse = {
  products: ShopifyProductSummary[]
}

export type ImportBatchResponse = {
  importId: string
  limitReached?: boolean
}

export type ConnectionState = {
  pairingToken: string
  pairingCode?: string
  apiBaseUrl: string
  shop?: string
  plan?: string
  planName?: string
}

export type EnrichedConnection = ConnectionState & {
  paired: boolean
}

export type ImportFilter = "all" | "withText" | "withPictures"

export type TemuReviewsInterceptPayload = {
  reviews: TemuReviewPayload[]
  maxListSize: number | null
  page: number | null
  goodsId: string | null
}