import { describe, expect, it } from "vitest"
import {
  isSeeAllReviewsLabel,
  normalizeText,
  resolveReviewsSelector,
  reviewHasPictures,
  reviewHasText,
  reviewMatchesFilter,
} from "../lib/temu/scraper"

describe("temu scraper helpers", () => {
  it("normalizes review button selectors", () => {
    expect(resolveReviewsSelector("see-all")).toBe("#see-all")
    expect(resolveReviewsSelector(".reviews-link")).toBe(".reviews-link")
    expect(resolveReviewsSelector("")).toBeNull()
  })

  it("detects see-all labels", () => {
    expect(isSeeAllReviewsLabel("See all reviews")).toBe(true)
    expect(isSeeAllReviewsLabel("See all reviews >")).toBe(true)
    expect(isSeeAllReviewsLabel("Item reviews")).toBe(false)
  })

  it("filters reviews by text and media", () => {
    const withText = {
      review_id: "1",
      comment: "Great product",
    }
    const withTranslated = {
      review_id: "2",
      review_lang: { translate_comment: "Nice" },
    }
    const withPictures = {
      review_id: "3",
      pictures: ["https://example.com/a.jpg"],
    }

    expect(reviewHasText(withText)).toBe(true)
    expect(reviewHasText(withTranslated)).toBe(true)
    expect(reviewHasPictures(withPictures)).toBe(true)
    expect(reviewMatchesFilter(withText, "withText")).toBe(true)
    expect(reviewMatchesFilter(withPictures, "withPictures")).toBe(true)
    expect(reviewMatchesFilter({ review_id: "4" }, "withText")).toBe(false)
  })

  it("normalizes whitespace", () => {
    expect(normalizeText("  See   all\nreviews ")).toBe("See all reviews")
  })
})