import { fetchReviews, submitReview, voteReview } from "./revora-widget-api";
import {
  escapeHtml,
  injectStyles,
  readI18n,
  renderFullWidget,
  renderLoading,
  renderSummary,
} from "./revora-widget-render";
import type {
  ReviewsPayload,
  SortOption,
  WidgetState,
} from "./revora-widget-types";

declare global {
  interface Window {
    __revoraReviewsWidgetLoaded?: boolean;
    __revoraWidgetState?: Map<HTMLElement, WidgetState>;
  }
}

function getStateMap() {
  if (!window.__revoraWidgetState) {
    window.__revoraWidgetState = new Map();
  }

  return window.__revoraWidgetState;
}

function getReviewLimit(root: HTMLElement) {
  return Number.parseInt(root.dataset.limit || "10", 10) || 10;
}

function readInitialReviewsPayload(root: HTMLElement): ReviewsPayload | null {
  const script = root.querySelector("script[data-revora-initial-reviews]");
  if (!script?.textContent?.trim()) {
    return null;
  }

  try {
    const data = JSON.parse(script.textContent) as ReviewsPayload;
    if (!data || typeof data !== "object") {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function hasInitialReviews(data: ReviewsPayload | null) {
  return Boolean(
    data &&
      (Number(data.count) > 0 ||
        (Array.isArray(data.reviews) && data.reviews.length > 0))
  );
}

function createWidgetState(
  data: ReviewsPayload,
  sort: SortOption = "recent"
): WidgetState {
  return {
    allReviews: Array.isArray(data.reviews) ? data.reviews : [],
    averageRating: Number(data.averageRating) || 0,
    count: Number(data.count) || 0,
    sort,
    photosOnly: false,
    selectedScore: 5,
    voted: new Set<string>(),
    loading: false,
  };
}

function loadFullWidgetReviews(root: HTMLElement, state: WidgetState) {
  const shop = root.dataset.shop;
  const productId = root.dataset.productId;
  if (!(shop && productId)) {
    return Promise.resolve();
  }

  state.loading = true;
  renderFullWidget(root, state);

  return fetchReviews(shop, productId, {
    limit: getReviewLimit(root),
    sort: state.sort,
    photosOnly: state.photosOnly,
  }).then((data) => {
    state.allReviews = Array.isArray(data.reviews) ? data.reviews : [];
    state.count = Number(data.count) || 0;
    state.averageRating = Number(data.averageRating) || 0;
    state.loading = false;
    renderFullWidget(root, state);
  });
}

function bindWidgetEvents(root: HTMLElement) {
  if (root.dataset.revoraEventsBound === "true") {
    return;
  }

  root.dataset.revoraEventsBound = "true";

  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.matches("[data-revora-sort]")) {
      return;
    }

    const state = getStateMap().get(root);
    if (!state) {
      return;
    }

    state.sort =
      ((target as HTMLSelectElement).value as SortOption) || "recent";
    void loadFullWidgetReviews(root, state);
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const state = getStateMap().get(root);
    if (!state) {
      return;
    }

    const shop = root.dataset.shop;
    const productId = root.dataset.productId;

    if (target.closest("[data-revora-photos-only]")) {
      state.photosOnly = !state.photosOnly;
      void loadFullWidgetReviews(root, state);
      return;
    }

    if (target.closest("[data-revora-toggle-form]")) {
      root.dataset.revoraShowForm =
        root.dataset.revoraShowForm === "true" ? "false" : "true";
      renderFullWidget(root, state);
      return;
    }

    const scoreButton = target.closest<HTMLElement>("[data-revora-score]");
    if (scoreButton?.dataset.revoraScore) {
      state.selectedScore =
        Number.parseInt(scoreButton.dataset.revoraScore, 10) || 5;
      renderFullWidget(root, state);
      return;
    }

    const voteButton = target.closest<HTMLElement>("[data-revora-vote]");
    if (voteButton) {
      const reviewId = voteButton.dataset.reviewId;
      const vote = voteButton.dataset.revoraVote;
      if (
        !(shop && productId && reviewId && vote) ||
        state.voted.has(reviewId)
      ) {
        return;
      }

      voteReview(shop, reviewId, vote)
        .then((result) => {
          state.voted.add(reviewId);
          state.allReviews = state.allReviews.map((review) =>
            review.id === reviewId
              ? {
                  ...review,
                  helpfulCount: result.helpfulCount,
                  notHelpfulCount: result.notHelpfulCount,
                }
              : review
          );
          renderFullWidget(root, state);
        })
        .catch(() => {
          // Ignore vote failures silently.
        });
    }
  });

  root.addEventListener("submit", (event) => {
    const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>(
      "[data-revora-review-form]"
    );
    if (!form) {
      return;
    }

    event.preventDefault();

    const state = getStateMap().get(root);
    if (!state) {
      return;
    }

    const shop = root.dataset.shop;
    const productId = root.dataset.productId;
    if (!(shop && productId)) {
      return;
    }

    const i18n = readI18n(root);
    const formData = new FormData(form);
    const submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );
    if (submitButton) {
      submitButton.disabled = true;
    }

    submitReview(shop, productId, {
      authorName: String(formData.get("authorName") || ""),
      authorEmail: String(formData.get("authorEmail") || ""),
      comment: String(formData.get("comment") || ""),
      score: state.selectedScore,
    })
      .then((result) => {
        const success = form.querySelector<HTMLElement>(
          "[data-revora-form-success]"
        );
        if (success) {
          success.hidden = false;
          success.textContent = result.message || i18n.formSuccess;
        }

        form.reset();
        state.selectedScore = 5;
        root.dataset.revoraShowForm = "false";
        return loadFullWidgetReviews(root, state);
      })
      .catch((error: Error) => {
        const success = form.querySelector<HTMLElement>(
          "[data-revora-form-success]"
        );
        if (success) {
          success.hidden = false;
          success.textContent = error.message;
        }
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
  });
}

function initRoot(root: HTMLElement) {
  const shop = root.dataset.shop;
  const productId = root.dataset.productId;
  const mode = root.dataset.mode || "full";
  const i18n = readI18n(root);

  if (!(shop && productId)) {
    return;
  }

  injectStyles();

  const summaryOnly = mode === "summary";
  const initialPayload = readInitialReviewsPayload(root);
  const bootstrapped = hasInitialReviews(initialPayload);

  if (bootstrapped && initialPayload) {
    if (summaryOnly) {
      renderSummary(root, initialPayload, i18n);
    } else {
      const state = createWidgetState(initialPayload);
      getStateMap().set(root, state);
      bindWidgetEvents(root);
      renderFullWidget(root, state);
    }
  } else {
    renderLoading(root, i18n);
  }

  fetchReviews(shop, productId, {
    limit: summaryOnly ? 1 : getReviewLimit(root),
    summaryOnly,
    sort: "recent",
  })
    .then((data) => {
      const apiCount = Number(data.count) || 0;
      const apiReviews = Array.isArray(data.reviews) ? data.reviews : [];

      if (bootstrapped && apiCount === 0 && apiReviews.length === 0) {
        return;
      }

      if (summaryOnly) {
        renderSummary(root, data, i18n);
        return;
      }

      const existing = getStateMap().get(root);
      const state = createWidgetState(data, existing?.sort ?? "recent");
      state.photosOnly = existing?.photosOnly ?? false;
      state.selectedScore = existing?.selectedScore ?? 5;
      state.voted = existing?.voted ?? new Set<string>();

      getStateMap().set(root, state);
      bindWidgetEvents(root);
      renderFullWidget(root, state);
    })
    .catch(() => {
      if (bootstrapped) {
        return;
      }

      if (mode === "summary") {
        root.innerHTML = "";
        return;
      }

      const emptyI18n = readI18n(root);
      root.innerHTML =
        '<div class="revora-reviews"><p class="revora-reviews__empty">' +
        escapeHtml(emptyI18n.empty) +
        "</p></div>";
    });
}

function init() {
  const roots = document.querySelectorAll<HTMLElement>(
    "#revora-reviews-root, .revora-reviews-root, .revora-reviews-summary-root"
  );

  for (const root of roots) {
    if (root.dataset.revoraInitialized === "true") {
      continue;
    }

    root.dataset.revoraInitialized = "true";
    initRoot(root);
  }
}

if (!window.__revoraReviewsWidgetLoaded) {
  window.__revoraReviewsWidgetLoaded = true;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
