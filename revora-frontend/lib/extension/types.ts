export type TemuReviewPayload = {
  review_id: string
  comment?: string
  score?: number
  name?: string
  time?: number
  pictures?: string[]
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
  pictures?: unknown[]
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
