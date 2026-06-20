import { describe, expect, it } from "vitest"
import { mapTemuReview } from "../lib/review-mapper"

describe("mapTemuReview", () => {
  it("maps Temu payloads into import review input", () => {
    expect(
      mapTemuReview({
        review_id: "99",
        comment: "Loved it",
        score: 5,
        name: "Alex",
        time: 1710000000,
        pictures: [{ url: " https://cdn.example/a.jpg " }, "https://cdn.example/b.jpg"],
        review_lang: { translate_comment: "Me encanta" },
      }),
    ).toEqual({
      temuReviewId: "99",
      comment: "Loved it",
      translatedComment: "Me encanta",
      score: 5,
      authorName: "Alex",
      reviewTime: 1710000000,
      pictures: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    })
  })
})