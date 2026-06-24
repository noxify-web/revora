import { describe, expect, it } from "vitest";
import { parseImportLimit } from "../lib/temu/panel";
import {
  resetCollection,
  shouldStopCollecting,
  trimCollectedReviewsToLimit,
} from "../lib/temu/scraper";
import { state } from "../lib/temu/shared";

describe("import limit helpers", () => {
  it("parses custom import limits", () => {
    expect(parseImportLimit("")).toBeNull();
    expect(parseImportLimit("  ")).toBeNull();
    expect(parseImportLimit("100")).toBe(100);
    expect(parseImportLimit("1000")).toBe(1000);
    expect(parseImportLimit("0")).toBeNull();
    expect(parseImportLimit("-5")).toBeNull();
    expect(parseImportLimit("abc")).toBeNull();
  });

  it("stops collecting once the import limit is reached", () => {
    resetCollection();
    state.importLimit = 100;
    state.reviews.set("1", { review_id: "1" });
    state.reviews.set("2", { review_id: "2" });

    expect(shouldStopCollecting("all")).toBe(false);

    for (let index = 3; index <= 100; index += 1) {
      state.reviews.set(String(index), { review_id: String(index) });
    }

    expect(shouldStopCollecting("all")).toBe(true);
  });

  it("trims collected reviews to the import limit", () => {
    resetCollection();
    state.importLimit = 3;

    for (let index = 1; index <= 5; index += 1) {
      state.reviews.set(String(index), { review_id: String(index) });
    }

    trimCollectedReviewsToLimit();

    expect(state.reviews.size).toBe(3);
    expect(Array.from(state.reviews.keys())).toEqual(["1", "2", "3"]);
  });
});
