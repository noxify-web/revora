(function () {
  "use strict";

  if (window.__revoraReviewsWidgetLoaded) {
    return;
  }
  window.__revoraReviewsWidgetLoaded = true;

  var STYLE_ID = "revora-reviews-styles";
  var API_PATH = "/apps/revora/reviews";

  var CSS =
    ".revora-reviews{border:1px solid #f0e4d8;border-radius:14px;padding:20px;background:#fff;color:#1a1a1a}" +
    ".revora-reviews__header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}" +
    ".revora-reviews__score{display:flex;align-items:center;gap:10px}" +
    ".revora-reviews__average{font-size:28px;font-weight:700;color:#fb7701}" +
    ".revora-reviews__stars,.revora-reviews__item-score{display:inline-flex;gap:2px}" +
    ".revora-reviews__star{color:#e8e8e8;font-size:14px}" +
    ".revora-reviews__star.is-filled{color:#fb7701}" +
    ".revora-reviews__count,.revora-reviews__date,.revora-reviews__empty{color:#5c5c5c;font-size:14px}" +
    ".revora-reviews__list{display:grid;gap:14px}" +
    ".revora-reviews__item{border-top:1px solid #f5efe8;padding-top:14px}" +
    ".revora-reviews__item-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}" +
    ".revora-reviews__comment{margin:8px 0 0;line-height:1.5}" +
    ".revora-reviews__photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
    ".revora-reviews__photos img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #f0e4d8}";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function formatCount(template, count) {
    var value = String(count);
    return (template || value + " reviews")
      .replace(/__COUNT__/g, value)
      .replace(/\{\{\s*count\s*\}\}/g, value);
  }

  function renderStars(rating) {
    var numericRating = Number(rating) || 0;
    var html = "";

    for (var i = 1; i <= 5; i += 1) {
      html +=
        '<span class="revora-reviews__star' +
        (i <= numericRating ? " is-filled" : "") +
        '">★</span>';
    }

    return html;
  }

  function readI18n(root) {
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

  function renderReview(review, i18n) {
    var author = review.authorName || i18n.customer;
    var score = Math.min(5, Math.max(1, Number(review.score) || 5));
    var comment = review.comment || "";
    var date = review.reviewDate || "";
    var pictures = Array.isArray(review.pictures) ? review.pictures : [];
    var photosHtml = "";

    if (pictures.length > 0) {
      photosHtml =
        '<div class="revora-reviews__photos">' +
        pictures
          .map(function (url) {
            return (
              '<img src="' +
              escapeHtml(url) +
              '" alt="' +
              escapeHtml(i18n.photoAlt) +
              '" loading="lazy" width="72" height="72">'
            );
          })
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
      (date ? '<p class="revora-reviews__date">' + escapeHtml(date) + "</p>" : "") +
      '<p class="revora-reviews__comment">' +
      escapeHtml(comment) +
      "</p>" +
      photosHtml +
      "</article>"
    );
  }

  function renderWidget(root, data, i18n) {
    var count = Number(data.count) || 0;
    var average = Number(data.averageRating) || 0;
    var reviews = Array.isArray(data.reviews) ? data.reviews : [];

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
      reviews.map(function (review) {
        return renderReview(review, i18n);
      }).join("") +
      "</div>" +
      "</div>";
  }

  function renderLoading(root, i18n) {
    root.innerHTML =
      '<div class="revora-reviews revora-reviews--loading"><p class="revora-reviews__empty">' +
      escapeHtml(i18n.loading) +
      "</p></div>";
  }

  function fetchReviews(shop, productId, limit) {
    var params = new URLSearchParams({
      shop: shop,
      product_id: String(productId),
      limit: String(limit),
    });

    return fetch(API_PATH + "?" + params.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Revora reviews request failed (" + response.status + ")");
      }

      return response.json();
    });
  }

  function initRoot(root) {
    var shop = root.dataset.shop;
    var productId = root.dataset.productId;
    var limit = parseInt(root.dataset.limit || "10", 10) || 10;
    var i18n = readI18n(root);

    if (!shop || !productId) {
      return;
    }

    injectStyles();
    renderLoading(root, i18n);

    fetchReviews(shop, productId, limit)
      .then(function (data) {
        renderWidget(root, data, i18n);
      })
      .catch(function () {
        root.innerHTML =
          '<div class="revora-reviews"><p class="revora-reviews__empty">' +
          escapeHtml(i18n.empty) +
          "</p></div>";
      });
  }

  function init() {
    var roots = document.querySelectorAll("#revora-reviews-root, .revora-reviews-root");

    roots.forEach(function (root) {
      if (root.dataset.revoraInitialized === "true") {
        return;
      }

      root.dataset.revoraInitialized = "true";
      initRoot(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();