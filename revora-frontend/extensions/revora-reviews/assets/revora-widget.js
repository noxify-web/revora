(() => {
  // ../packages/revora-shared/src/theme-storefront.ts
  var REVORA_WIDGET_PALETTE = {
    brand: "#FF4F1A",
    text: "#0C0C0C",
    textSubdued: "#5C5A56",
    surfaceSubdued: "#F6F3EE",
    surfaceHover: "#E8E4DC"
  };
  function getRevoraReviewsWidgetCss() {
    const border = REVORA_WIDGET_PALETTE.surfaceHover;
    const text = REVORA_WIDGET_PALETTE.text.toLowerCase();
    const textSubdued = REVORA_WIDGET_PALETTE.textSubdued.toLowerCase();
    const brand = REVORA_WIDGET_PALETTE.brand.toLowerCase();
    const surfaceSubdued = REVORA_WIDGET_PALETTE.surfaceSubdued.toLowerCase();
    return `.revora-reviews{border:1px solid ${border};border-radius:14px;padding:20px;background:${surfaceSubdued};color:${text}}` + ".revora-reviews__header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}" + ".revora-reviews__score{display:flex;align-items:center;gap:10px}" + `.revora-reviews__average{font-size:28px;font-weight:700;color:${brand}}` + ".revora-reviews__stars,.revora-reviews__item-score{display:inline-flex;gap:2px}" + `.revora-reviews__star{color:${border};font-size:14px}` + `.revora-reviews__star.is-filled{color:${brand}}` + `.revora-reviews__count,.revora-reviews__date,.revora-reviews__empty{color:${textSubdued};font-size:14px}` + ".revora-reviews__list{display:grid;gap:14px}" + `.revora-reviews__item{border-top:1px solid ${border};padding-top:14px}` + ".revora-reviews__item-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}" + ".revora-reviews__comment{margin:8px 0 0;line-height:1.5}" + ".revora-reviews__photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" + `.revora-reviews__photos img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid ${border}}`;
  }

  // lib/storefront/revora-widget.ts
  if (!window.__revoraReviewsWidgetLoaded) {
    let injectStyles = function() {
      if (document.getElementById(STYLE_ID)) {
        return;
      }
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }, escapeHtml = function(text) {
      const div = document.createElement("div");
      div.textContent = text == null ? "" : String(text);
      return div.innerHTML;
    }, formatCount = function(template, count) {
      const value = String(count);
      return (template || `${value} reviews`).replace(/__COUNT__/g, value).replace(/\{\{\s*count\s*\}\}/g, value);
    }, renderStars = function(rating) {
      const numericRating = Number(rating) || 0;
      let html = "";
      for (let i = 1;i <= 5; i += 1) {
        html += '<span class="revora-reviews__star' + (i <= numericRating ? " is-filled" : "") + '">★</span>';
      }
      return html;
    }, readI18n = function(root) {
      return {
        count: root.dataset.i18nCount || "__COUNT__ reviews",
        empty: root.dataset.i18nEmpty || "No reviews published yet. Import and publish from Revora.",
        customer: root.dataset.i18nCustomer || "Customer",
        photoAlt: root.dataset.i18nPhotoAlt || "Review photo",
        loading: root.dataset.i18nLoading || "Loading reviews…"
      };
    }, renderReview = function(review, i18n) {
      const author = review.authorName || i18n.customer;
      const score = Math.min(5, Math.max(1, Number(review.score) || 5));
      const comment = review.comment || "";
      const date = review.reviewDate || "";
      const pictures = Array.isArray(review.pictures) ? review.pictures : [];
      let photosHtml = "";
      if (pictures.length > 0) {
        photosHtml = '<div class="revora-reviews__photos">' + pictures.map((url) => '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(i18n.photoAlt) + '" loading="lazy" width="72" height="72">').join("") + "</div>";
      }
      return '<article class="revora-reviews__item">' + '<div class="revora-reviews__item-head">' + "<strong>" + escapeHtml(author) + "</strong>" + '<span class="revora-reviews__item-score" aria-label="' + score + ' out of 5 stars">' + renderStars(score) + "</span>" + "</div>" + (date ? `<p class="revora-reviews__date">${escapeHtml(date)}</p>` : "") + '<p class="revora-reviews__comment">' + escapeHtml(comment) + "</p>" + photosHtml + "</article>";
    }, renderWidget = function(root, data, i18n) {
      const count = Number(data.count) || 0;
      const average = Number(data.averageRating) || 0;
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      if (count === 0 || reviews.length === 0) {
        root.innerHTML = '<div class="revora-reviews"><p class="revora-reviews__empty">' + escapeHtml(i18n.empty) + "</p></div>";
        return;
      }
      root.innerHTML = '<div class="revora-reviews">' + '<div class="revora-reviews__header">' + '<div class="revora-reviews__score">' + '<span class="revora-reviews__average">' + escapeHtml(average.toFixed(1)) + "</span>" + '<div class="revora-reviews__stars" aria-label="' + average + ' out of 5 stars">' + renderStars(average) + "</div>" + "</div>" + '<p class="revora-reviews__count">' + escapeHtml(formatCount(i18n.count, count)) + "</p>" + "</div>" + '<div class="revora-reviews__list">' + reviews.map((review) => renderReview(review, i18n)).join("") + "</div>" + "</div>";
    }, renderLoading = function(root, i18n) {
      root.innerHTML = '<div class="revora-reviews revora-reviews--loading"><p class="revora-reviews__empty">' + escapeHtml(i18n.loading) + "</p></div>";
    }, fetchReviews = function(shop, productId, limit) {
      const params = new URLSearchParams({
        shop,
        product_id: String(productId),
        limit: String(limit)
      });
      return fetch(`${API_PATH}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Revora reviews request failed (${response.status})`);
        }
        return response.json();
      });
    }, initRoot = function(root) {
      const shop = root.dataset.shop;
      const productId = root.dataset.productId;
      const limit = Number.parseInt(root.dataset.limit || "10", 10) || 10;
      const i18n = readI18n(root);
      if (!(shop && productId)) {
        return;
      }
      injectStyles();
      renderLoading(root, i18n);
      fetchReviews(shop, productId, limit).then((data) => {
        renderWidget(root, data, i18n);
      }).catch(() => {
        root.innerHTML = '<div class="revora-reviews"><p class="revora-reviews__empty">' + escapeHtml(i18n.empty) + "</p></div>";
      });
    }, init = function() {
      const roots = document.querySelectorAll("#revora-reviews-root, .revora-reviews-root");
      for (const root of roots) {
        if (root.dataset.revoraInitialized === "true") {
          continue;
        }
        root.dataset.revoraInitialized = "true";
        initRoot(root);
      }
    };
    window.__revoraReviewsWidgetLoaded = true;
    const STYLE_ID = "revora-reviews-styles";
    const API_PATH = "/apps/revora/reviews";
    const CSS = getRevoraReviewsWidgetCss();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
