import { getRevoraReviewsWidgetCss } from "@revora/shared/theme-storefront";

import {
  type I18n,
  type Review,
  SORT_OPTIONS,
  type SortOption,
  type WidgetState,
} from "./revora-widget-types";

const STYLE_ID = "revora-reviews-styles";

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = getRevoraReviewsWidgetCss();
  document.head.appendChild(style);
}

export function escapeHtml(text: unknown) {
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

export function renderStars(rating: number, max = 5) {
  const numericRating = Number(rating) || 0;
  let html = "";

  for (let i = 1; i <= max; i += 1) {
    html +=
      '<span class="revora-reviews__star' +
      (i <= Math.round(numericRating) ? " is-filled" : "") +
      '">★</span>';
  }

  return html;
}

export function readI18n(root: HTMLElement): I18n {
  return {
    count: root.dataset.i18nCount || "__COUNT__ reviews",
    empty:
      root.dataset.i18nEmpty ||
      "No reviews published yet. Import and publish from Revora.",
    customer: root.dataset.i18nCustomer || "Customer",
    photoAlt: root.dataset.i18nPhotoAlt || "Review photo",
    loading: root.dataset.i18nLoading || "Loading reviews…",
    sortLabel: root.dataset.i18nSortLabel || "Sort by",
    sortRecent: root.dataset.i18nSortRecent || "Most recent",
    sortHighest: root.dataset.i18nSortHighest || "Highest rated",
    sortLowest: root.dataset.i18nSortLowest || "Lowest rated",
    sortHelpful: root.dataset.i18nSortHelpful || "Most helpful",
    photosOnly: root.dataset.i18nPhotosOnly || "Photos only",
    helpful: root.dataset.i18nHelpful || "Helpful",
    notHelpful: root.dataset.i18nNotHelpful || "Not helpful",
    writeReview: root.dataset.i18nWriteReview || "Write a review",
    formTitle: root.dataset.i18nFormTitle || "Share your experience",
    formName: root.dataset.i18nFormName || "Your name",
    formEmail: root.dataset.i18nFormEmail || "Email (optional)",
    formRating: root.dataset.i18nFormRating || "Rating",
    formSubmit: root.dataset.i18nFormSubmit || "Submit review",
    formSuccess:
      root.dataset.i18nFormSuccess || "Thank you! Your review was submitted.",
    summaryLink: root.dataset.i18nSummaryLink || "See all reviews",
  };
}

function renderReview(review: Review, i18n: I18n, voted: Set<string>) {
  const author = review.authorName || i18n.customer;
  const score = Math.min(5, Math.max(1, Number(review.score) || 5));
  const comment = review.comment || "";
  const date = review.reviewDate || "";
  const pictures = Array.isArray(review.pictures) ? review.pictures : [];
  const reviewId = review.id || "";
  const helpfulCount = Number(review.helpfulCount) || 0;
  const notHelpfulCount = Number(review.notHelpfulCount) || 0;
  const hasVoted = voted.has(reviewId);
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

  const voteButtons = reviewId
    ? '<div class="revora-reviews__votes">' +
      '<button type="button" class="revora-reviews__button' +
      (hasVoted ? " is-active" : "") +
      '" data-revora-vote="helpful" data-review-id="' +
      escapeHtml(reviewId) +
      '" ' +
      (hasVoted ? "disabled" : "") +
      ">" +
      escapeHtml(i18n.helpful) +
      " (" +
      helpfulCount +
      ")</button>" +
      '<button type="button" class="revora-reviews__button' +
      (hasVoted ? " is-active" : "") +
      '" data-revora-vote="not_helpful" data-review-id="' +
      escapeHtml(reviewId) +
      '" ' +
      (hasVoted ? "disabled" : "") +
      ">" +
      escapeHtml(i18n.notHelpful) +
      " (" +
      notHelpfulCount +
      ")</button>" +
      "</div>"
    : "";

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
    voteButtons +
    "</article>"
  );
}

function renderStarInput(selectedScore: number) {
  let html = '<div class="revora-reviews__star-input" data-revora-star-input>';

  for (let score = 1; score <= 5; score += 1) {
    html +=
      '<button type="button" data-revora-score="' +
      score +
      '" class="' +
      (score <= selectedScore ? "is-filled" : "") +
      '">★</button>';
  }

  html += "</div>";
  return html;
}

function renderWriteForm(i18n: I18n, selectedScore: number) {
  return (
    '<form class="revora-reviews__form" data-revora-review-form>' +
    "<h3>" +
    escapeHtml(i18n.formTitle) +
    "</h3>" +
    '<div class="revora-reviews__form-row">' +
    '<input class="revora-reviews__input" name="authorName" required maxlength="80" placeholder="' +
    escapeHtml(i18n.formName) +
    '">' +
    '<input class="revora-reviews__input" name="authorEmail" type="email" maxlength="120" placeholder="' +
    escapeHtml(i18n.formEmail) +
    '">' +
    "</div>" +
    "<label>" +
    escapeHtml(i18n.formRating) +
    renderStarInput(selectedScore) +
    "</label>" +
    '<textarea class="revora-reviews__textarea" name="comment" required minlength="3" maxlength="2000" placeholder="' +
    escapeHtml(i18n.writeReview) +
    '"></textarea>' +
    '<button type="submit" class="revora-reviews__button is-primary">' +
    escapeHtml(i18n.formSubmit) +
    "</button>" +
    '<p class="revora-reviews__success" hidden data-revora-form-success></p>' +
    "</form>"
  );
}

function renderToolbar(
  i18n: I18n,
  sort: SortOption,
  photosOnly: boolean,
  showForm: boolean
) {
  const sortOptions = SORT_OPTIONS.map((option) => {
    const label =
      option === "highest"
        ? i18n.sortHighest
        : option === "lowest"
          ? i18n.sortLowest
          : option === "helpful"
            ? i18n.sortHelpful
            : i18n.sortRecent;

    return (
      '<option value="' +
      option +
      '"' +
      (sort === option ? " selected" : "") +
      ">" +
      escapeHtml(label) +
      "</option>"
    );
  }).join("");

  return (
    '<div class="revora-reviews__toolbar">' +
    '<label class="revora-reviews__meta">' +
    escapeHtml(i18n.sortLabel) +
    '<select class="revora-reviews__select" data-revora-sort>' +
    sortOptions +
    "</select></label>" +
    '<button type="button" class="revora-reviews__button' +
    (photosOnly ? " is-active" : "") +
    '" data-revora-photos-only>' +
    escapeHtml(i18n.photosOnly) +
    "</button>" +
    '<button type="button" class="revora-reviews__button' +
    (showForm ? " is-active" : "") +
    '" data-revora-toggle-form>' +
    escapeHtml(i18n.writeReview) +
    "</button>" +
    "</div>"
  );
}

export function renderSummary(
  root: HTMLElement,
  data: { averageRating?: number; count?: number },
  i18n: I18n
) {
  const count = Number(data.count) || 0;
  const average = Number(data.averageRating) || 0;

  if (count === 0) {
    root.innerHTML = "";
    return;
  }

  const anchor = root.dataset.summaryAnchor || "#revora-reviews-section";
  const link =
    root.dataset.mode === "summary" && anchor
      ? '<a class="revora-reviews-summary__link" href="' +
        escapeHtml(anchor) +
        '">' +
        escapeHtml(i18n.summaryLink) +
        "</a>"
      : "";

  root.innerHTML =
    '<div class="revora-reviews-summary" aria-label="' +
    average.toFixed(1) +
    " out of 5 stars, " +
    count +
    ' reviews">' +
    '<span class="revora-reviews-summary__average">' +
    escapeHtml(average.toFixed(1)) +
    "</span>" +
    '<span class="revora-reviews__summary-stars" aria-hidden="true">' +
    renderStars(average) +
    "</span>" +
    '<span class="revora-reviews-summary__count">' +
    escapeHtml(formatCount(i18n.count, count)) +
    "</span>" +
    link +
    "</div>";
}

export function renderLoading(root: HTMLElement, i18n: I18n) {
  root.innerHTML =
    '<div class="revora-reviews revora-reviews--loading"><p class="revora-reviews__empty">' +
    escapeHtml(i18n.loading) +
    "</p></div>";
}

export function renderFullWidget(root: HTMLElement, state: WidgetState) {
  const i18n = readI18n(root);
  const limit = Number.parseInt(root.dataset.limit || "10", 10) || 10;
  const showForm = root.dataset.revoraShowForm === "true";
  const reviews = state.allReviews.slice(0, limit);

  if (state.loading) {
    renderLoading(root, i18n);
    return;
  }

  if (state.count === 0 || state.allReviews.length === 0) {
    root.innerHTML =
      '<div id="revora-reviews-section" class="revora-reviews" data-revora-widget-panel>' +
      '<p class="revora-reviews__empty">' +
      escapeHtml(i18n.empty) +
      "</p>" +
      renderWriteForm(i18n, state.selectedScore) +
      "</div>";
    return;
  }

  root.innerHTML =
    '<div id="revora-reviews-section" class="revora-reviews" data-revora-widget-panel>' +
    '<div class="revora-reviews__header">' +
    '<div class="revora-reviews__score">' +
    '<span class="revora-reviews__average">' +
    escapeHtml(state.averageRating.toFixed(1)) +
    "</span>" +
    '<div class="revora-reviews__stars" aria-label="' +
    state.averageRating +
    ' out of 5 stars">' +
    renderStars(state.averageRating) +
    "</div>" +
    "</div>" +
    '<p class="revora-reviews__count">' +
    escapeHtml(formatCount(i18n.count, state.count)) +
    "</p>" +
    "</div>" +
    renderToolbar(i18n, state.sort, state.photosOnly, showForm) +
    (showForm ? renderWriteForm(i18n, state.selectedScore) : "") +
    '<div class="revora-reviews__list">' +
    (reviews.length
      ? reviews
          .map((review) => renderReview(review, i18n, state.voted))
          .join("")
      : `<p class="revora-reviews__empty">${escapeHtml(i18n.empty)}</p>`) +
    "</div>" +
    "</div>";
}
