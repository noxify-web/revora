import { getRevoraReviewsWidgetCss } from "@revora/shared/theme-storefront";

declare global {
  interface Window {
    __revoraReviewsWidgetLoaded?: boolean;
  }
}

if (!window.__revoraReviewsWidgetLoaded) {
  window.__revoraReviewsWidgetLoaded = true;

  const STYLE_ID = "revora-reviews-styles";
  const API_PATH = "/apps/revora/reviews";
  const CSS = getRevoraReviewsWidgetCss();

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function escapeHtml(text: unknown) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function formatCount(template: string, count: number) {
    const value = String(count);
    return (template || `${value} reviews`)
      .replace(/__COUNT__/g, value)
      .replace(/\{\{\s*count\s*\}\}/g, value);
  }

  function renderStars(rating: number) {
    const numericRating = Number(rating) || 0;
    let html = "";

    for (let i = 1; i <= 5; i += 1) {
      html +=
        '<span class="revora-reviews__star' +
        (i <= numericRating ? " is-filled" : "") +
        '">★</span>';
    }

    return html;
  }

  function readI18n(root: HTMLElement) {
    return {
      count: root.dataset.i18nCount || "__COUNT__ reviews",
      empty:
        root.dataset.i18nEmpty ||
        "No reviews published yet. Import and publish from Revora.",
      customer: root.dataset.i18nCustomer || "Customer",
      photoAlt: root.dataset.i18nPhotoAlt || "Review photo",
      loading: root.dataset.i18nLoading || "Loading reviews…",
    };
  }

  interface Review {
    authorName?: string;
    comment?: string;
    pictures?: string[];
    reviewDate?: string;
    score?: number;
  }

  function renderReview(review: Review, i18n: ReturnType<typeof readI18n>) {
    const author = review.authorName || i18n.customer;
    const score = Math.min(5, Math.max(1, Number(review.score) || 5));
    const comment = review.comment || "";
    const date = review.reviewDate || "";
    const pictures = Array.isArray(review.pictures) ? review.pictures : [];
    let photosHtml = "";

    if (pictures.length > 0) {
      photosHtml =
        '<div class="revora-reviews__photos">' +
        pictures
          .map(
            (url) =>
              '<img src="' +
              escapeHtml(url) +
              '" alt="' +
              escapeHtml(i18n.photoAlt) +
              '" loading="lazy" width="72" height="72">'
          )
          .join("") +
        "</div>";
    }

    return (
      '<article class="revora-reviews__item">' +
      '<div class="revora-reviews__item-head">' +
      "<strong>" +
      escapeHtml(author) +
      "</strong>" +
      '<span class="revora-reviews__item-score" aria-label="' +
      score +
      ' out of 5 stars">' +
      renderStars(score) +
      "</span>" +
      "</div>" +
      (date ? `<p class="revora-reviews__date">${escapeHtml(date)}</p>` : "") +
      '<p class="revora-reviews__comment">' +
      escapeHtml(comment) +
      "</p>" +
      photosHtml +
      "</article>"
    );
  }

  function renderWidget(
    root: HTMLElement,
    data: {
      count?: number;
      averageRating?: number;
      reviews?: Review[];
    },
    i18n: ReturnType<typeof readI18n>
  ) {
    const count = Number(data.count) || 0;
    const average = Number(data.averageRating) || 0;
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];

    if (count === 0 || reviews.length === 0) {
      root.innerHTML =
        '<div class="revora-reviews"><p class="revora-reviews__empty">' +
        escapeHtml(i18n.empty) +
        "</p></div>";
      return;
    }

    root.innerHTML =
      '<div class="revora-reviews">' +
      '<div class="revora-reviews__header">' +
      '<div class="revora-reviews__score">' +
      '<span class="revora-reviews__average">' +
      escapeHtml(average.toFixed(1)) +
      "</span>" +
      '<div class="revora-reviews__stars" aria-label="' +
      average +
      ' out of 5 stars">' +
      renderStars(average) +
      "</div>" +
      "</div>" +
      '<p class="revora-reviews__count">' +
      escapeHtml(formatCount(i18n.count, count)) +
      "</p>" +
      "</div>" +
      '<div class="revora-reviews__list">' +
      reviews.map((review) => renderReview(review, i18n)).join("") +
      "</div>" +
      "</div>";
  }

  function renderLoading(root: HTMLElement, i18n: ReturnType<typeof readI18n>) {
    root.innerHTML =
      '<div class="revora-reviews revora-reviews--loading"><p class="revora-reviews__empty">' +
      escapeHtml(i18n.loading) +
      "</p></div>";
  }

  function fetchReviews(shop: string, productId: string, limit: number) {
    const params = new URLSearchParams({
      shop,
      product_id: String(productId),
      limit: String(limit),
    });

    return fetch(`${API_PATH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Revora reviews request failed (${response.status})`);
      }

      return response.json();
    });
  }

  function initRoot(root: HTMLElement) {
    const shop = root.dataset.shop;
    const productId = root.dataset.productId;
    const limit = Number.parseInt(root.dataset.limit || "10", 10) || 10;
    const i18n = readI18n(root);

    if (!(shop && productId)) {
      return;
    }

    injectStyles();
    renderLoading(root, i18n);

    fetchReviews(shop, productId, limit)
      .then((data) => {
        renderWidget(root, data, i18n);
      })
      .catch(() => {
        root.innerHTML =
          '<div class="revora-reviews"><p class="revora-reviews__empty">' +
          escapeHtml(i18n.empty) +
          "</p></div>";
      });
  }

  function init() {
    const roots = document.querySelectorAll<HTMLElement>(
      "#revora-reviews-root, .revora-reviews-root"
    );

    for (const root of roots) {
      if (root.dataset.revoraInitialized === "true") {
        continue;
      }

      root.dataset.revoraInitialized = "true";
      initRoot(root);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
