import type {
  ImportReviewInput,
  TemuReviewPayload,
} from "@revora/shared/extension-types"

export function mapTemuReview(review: TemuReviewPayload): ImportReviewInput {
  const pictures = Array.isArray(review.pictures)
    ? review.pictures
        .map((item) => {
          if (typeof item === "string") return item.trim()
          if (item && typeof item === "object" && item.url) {
            return String(item.url).trim()
          }
          return null
        })
        .filter((url): url is string => Boolean(url))
    : []

  return {
    temuReviewId: String(review.review_id),
    comment: review.comment || "",
    translatedComment: review.review_lang?.translate_comment || "",
    score: review.score ?? null,
    authorName: review.name || "",
    reviewTime: review.time ?? null,
    pictures,
  }
}