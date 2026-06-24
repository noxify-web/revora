(() => {
  // lib/storefront/revora-widget-api.ts
  var REVORA_REVIEWS_API_PATH = "/apps/revora/reviews";
  function fetchReviews(shop, productId, options) {
    const params = new URLSearchParams({
      shop,
      product_id: String(productId),
      limit: String(options.limit)
    });
    if (options.summaryOnly) {
      params.set("summary_only", "1");
    }
    if (options.sort) {
      params.set("sort", options.sort);
    }
    if (options.photosOnly) {
      params.set("photos_only", "1");
    }
    return fetch(`${REVORA_REVIEWS_API_PATH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Revora reviews request failed (${response.status})`);
      }
      return response.json();
    });
  }
  function submitReview(shop, productId, payload) {
    return fetch(REVORA_REVIEWS_API_PATH, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        shop,
        productId,
        ...payload
      })
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review");
      }
      return data;
    });
  }
  function voteReview(shop, reviewId, vote) {
    return fetch(`${REVORA_REVIEWS_API_PATH}/${reviewId}/vote`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ shop, vote })
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to vote");
      }
      return data;
    });
  }

  // ../packages/revora-shared/src/theme-storefront.ts
  var REVORA_WIDGET_PALETTE = {
    brand: "#FF4F1A",
    text: "#0C0C0C",
    textSubdued: "#5C5A56",
    surfaceSubdued: "#F6F3EE",
    surfaceHover: "#E8E4DC",
    surface: "#FFFFFF",
    border: "#E8E4DC",
    success: "#1F7A4D"
  };
  function getRevoraReviewsWidgetCss() {
    const border = REVORA_WIDGET_PALETTE.border;
    const text = REVORA_WIDGET_PALETTE.text.toLowerCase();
    const textSubdued = REVORA_WIDGET_PALETTE.textSubdued.toLowerCase();
    const brand = REVORA_WIDGET_PALETTE.brand.toLowerCase();
    const surfaceSubdued = REVORA_WIDGET_PALETTE.surfaceSubdued.toLowerCase();
    const surface = REVORA_WIDGET_PALETTE.surface.toLowerCase();
    const success = REVORA_WIDGET_PALETTE.success.toLowerCase();
    return `.revora-reviews{border:1px solid ${border};border-radius:14px;padding:20px;background:${surfaceSubdued};color:${text}}` + ".revora-reviews--loading{opacity:.85}" + ".revora-reviews__header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}" + ".revora-reviews__score{display:flex;align-items:center;gap:10px}" + `.revora-reviews__average{font-size:28px;font-weight:700;color:${brand}}` + ".revora-reviews__stars,.revora-reviews__item-score,.revora-reviews__summary-stars{display:inline-flex;gap:2px;align-items:center}" + `.revora-reviews__star{color:${border};font-size:14px;line-height:1}` + `.revora-reviews__star.is-filled{color:${brand}}` + `.revora-reviews__count,.revora-reviews__date,.revora-reviews__empty,.revora-reviews__meta{color:${textSubdued};font-size:14px}` + ".revora-reviews__toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}" + `.revora-reviews__select,.revora-reviews__input,.revora-reviews__textarea{border:1px solid ${border};border-radius:8px;padding:8px 10px;background:${surface};color:${text};font:inherit}` + ".revora-reviews__textarea{min-height:96px;resize:vertical;width:100%}" + `.revora-reviews__button{border:1px solid ${border};border-radius:999px;padding:8px 14px;background:${surface};color:${text};font:inherit;cursor:pointer}` + `.revora-reviews__button:hover{background:${surfaceSubdued}}` + `.revora-reviews__button.is-primary{background:${brand};border-color:${brand};color:#fff}` + ".revora-reviews__button.is-primary:hover{filter:brightness(.95)}" + `.revora-reviews__button.is-active{background:${brand};border-color:${brand};color:#fff}` + ".revora-reviews__list{display:grid;gap:14px}" + `.revora-reviews__item{border-top:1px solid ${border};padding-top:14px}` + ".revora-reviews__item-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;flex-wrap:wrap}" + ".revora-reviews__comment{margin:8px 0 0;line-height:1.5;white-space:pre-wrap}" + ".revora-reviews__photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" + `.revora-reviews__photos img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid ${border}}` + ".revora-reviews__votes{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}" + ".revora-reviews__form{display:grid;gap:10px;margin-top:18px;padding-top:18px;border-top:1px solid " + border + "}" + ".revora-reviews__form-row{display:grid;gap:10px}" + "@media(min-width:640px){.revora-reviews__form-row{grid-template-columns:1fr 1fr}}" + ".revora-reviews__star-input{display:inline-flex;gap:4px}" + `.revora-reviews__star-input button{border:none;background:transparent;color:${border};font-size:22px;cursor:pointer;padding:0}` + `.revora-reviews__star-input button.is-filled{color:${brand}}` + `.revora-reviews__success{color:${success};font-size:14px}` + ".revora-reviews-summary{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}" + `.revora-reviews-summary__average{font-weight:700;color:${text};font-size:14px}` + `.revora-reviews-summary__count{color:${textSubdued};font-size:13px}` + `.revora-reviews-summary__link{color:${brand};font-size:13px;text-decoration:none}` + ".revora-reviews-summary__link:hover{text-decoration:underline}" + ".revora-reviews-summary .revora-reviews__star{font-size:13px}";
  }

  // lib/storefront/revora-widget-types.ts
  var SORT_OPTIONS = [
    "recent",
    "highest",
    "lowest",
    "helpful"
  ];

  // lib/storefront/revora-widget-render.ts
  var STYLE_ID = "revora-reviews-styles";
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = getRevoraReviewsWidgetCss();
    document.head.appendChild(style);
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }
  function formatCount(template, count) {
    const value = String(count);
    return (template || `${value} reviews`).replace(/__COUNT__/g, value).replace(/\{\{\s*count\s*\}\}/g, value);
  }
  function renderStars(rating, max = 5) {
    const numericRating = Number(rating) || 0;
    let html = "";
    for (let i = 1;i <= max; i += 1) {
      html += '<span class="revora-reviews__star' + (i <= Math.round(numericRating) ? " is-filled" : "") + '">★</span>';
    }
    return html;
  }
  function readI18n(root) {
    return {
      count: root.dataset.i18nCount || "__COUNT__ reviews",
      empty: root.dataset.i18nEmpty || "No reviews published yet. Import and publish from Revora.",
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
      formSuccess: root.dataset.i18nFormSuccess || "Thank you! Your review was submitted.",
      summaryLink: root.dataset.i18nSummaryLink || "See all reviews"
    };
  }
  function renderReview(review, i18n, voted) {
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
      photosHtml = '<div class="revora-reviews__photos">' + pictures.map((url) => '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(i18n.photoAlt) + '" loading="lazy" width="72" height="72">').join("") + "</div>";
    }
    const voteButtons = reviewId ? '<div class="revora-reviews__votes">' + '<button type="button" class="revora-reviews__button' + (hasVoted ? " is-active" : "") + '" data-revora-vote="helpful" data-review-id="' + escapeHtml(reviewId) + '" ' + (hasVoted ? "disabled" : "") + ">" + escapeHtml(i18n.helpful) + " (" + helpfulCount + ")</button>" + '<button type="button" class="revora-reviews__button' + (hasVoted ? " is-active" : "") + '" data-revora-vote="not_helpful" data-review-id="' + escapeHtml(reviewId) + '" ' + (hasVoted ? "disabled" : "") + ">" + escapeHtml(i18n.notHelpful) + " (" + notHelpfulCount + ")</button>" + "</div>" : "";
    return '<article class="revora-reviews__item">' + '<div class="revora-reviews__item-head">' + "<strong>" + escapeHtml(author) + "</strong>" + '<span class="revora-reviews__item-score" aria-label="' + score + ' out of 5 stars">' + renderStars(score) + "</span>" + "</div>" + (date ? `<p class="revora-reviews__date">${escapeHtml(date)}</p>` : "") + '<p class="revora-reviews__comment">' + escapeHtml(comment) + "</p>" + photosHtml + voteButtons + "</article>";
  }
  function renderStarInput(selectedScore) {
    let html = '<div class="revora-reviews__star-input" data-revora-star-input>';
    for (let score = 1;score <= 5; score += 1) {
      html += '<button type="button" data-revora-score="' + score + '" class="' + (score <= selectedScore ? "is-filled" : "") + '">★</button>';
    }
    html += "</div>";
    return html;
  }
  function renderWriteForm(i18n, selectedScore) {
    return '<form class="revora-reviews__form" data-revora-review-form>' + "<h3>" + escapeHtml(i18n.formTitle) + "</h3>" + '<div class="revora-reviews__form-row">' + '<input class="revora-reviews__input" name="authorName" required maxlength="80" placeholder="' + escapeHtml(i18n.formName) + '">' + '<input class="revora-reviews__input" name="authorEmail" type="email" maxlength="120" placeholder="' + escapeHtml(i18n.formEmail) + '">' + "</div>" + "<label>" + escapeHtml(i18n.formRating) + renderStarInput(selectedScore) + "</label>" + '<textarea class="revora-reviews__textarea" name="comment" required minlength="3" maxlength="2000" placeholder="' + escapeHtml(i18n.writeReview) + '"></textarea>' + '<button type="submit" class="revora-reviews__button is-primary">' + escapeHtml(i18n.formSubmit) + "</button>" + '<p class="revora-reviews__success" hidden data-revora-form-success></p>' + "</form>";
  }
  function renderToolbar(i18n, sort, photosOnly, showForm) {
    const sortOptions = SORT_OPTIONS.map((option) => {
      const label = option === "highest" ? i18n.sortHighest : option === "lowest" ? i18n.sortLowest : option === "helpful" ? i18n.sortHelpful : i18n.sortRecent;
      return '<option value="' + option + '"' + (sort === option ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
    }).join("");
    return '<div class="revora-reviews__toolbar">' + '<label class="revora-reviews__meta">' + escapeHtml(i18n.sortLabel) + '<select class="revora-reviews__select" data-revora-sort>' + sortOptions + "</select></label>" + '<button type="button" class="revora-reviews__button' + (photosOnly ? " is-active" : "") + '" data-revora-photos-only>' + escapeHtml(i18n.photosOnly) + "</button>" + '<button type="button" class="revora-reviews__button' + (showForm ? " is-active" : "") + '" data-revora-toggle-form>' + escapeHtml(i18n.writeReview) + "</button>" + "</div>";
  }
  function renderSummary(root, data, i18n) {
    const count = Number(data.count) || 0;
    const average = Number(data.averageRating) || 0;
    if (count === 0) {
      root.innerHTML = "";
      return;
    }
    const anchor = root.dataset.summaryAnchor || "#revora-reviews-section";
    const link = root.dataset.mode === "summary" && anchor ? '<a class="revora-reviews-summary__link" href="' + escapeHtml(anchor) + '">' + escapeHtml(i18n.summaryLink) + "</a>" : "";
    root.innerHTML = '<div class="revora-reviews-summary" aria-label="' + average.toFixed(1) + " out of 5 stars, " + count + ' reviews">' + '<span class="revora-reviews-summary__average">' + escapeHtml(average.toFixed(1)) + "</span>" + '<span class="revora-reviews__summary-stars" aria-hidden="true">' + renderStars(average) + "</span>" + '<span class="revora-reviews-summary__count">' + escapeHtml(formatCount(i18n.count, count)) + "</span>" + link + "</div>";
  }
  function renderLoading(root, i18n) {
    root.innerHTML = '<div class="revora-reviews revora-reviews--loading"><p class="revora-reviews__empty">' + escapeHtml(i18n.loading) + "</p></div>";
  }
  function renderFullWidget(root, state) {
    const i18n = readI18n(root);
    const limit = Number.parseInt(root.dataset.limit || "10", 10) || 10;
    const showForm = root.dataset.revoraShowForm === "true";
    const reviews = state.allReviews.slice(0, limit);
    if (state.loading) {
      renderLoading(root, i18n);
      return;
    }
    if (state.count === 0 || state.allReviews.length === 0) {
      root.innerHTML = '<div id="revora-reviews-section" class="revora-reviews" data-revora-widget-panel>' + '<p class="revora-reviews__empty">' + escapeHtml(i18n.empty) + "</p>" + renderWriteForm(i18n, state.selectedScore) + "</div>";
      return;
    }
    root.innerHTML = '<div id="revora-reviews-section" class="revora-reviews" data-revora-widget-panel>' + '<div class="revora-reviews__header">' + '<div class="revora-reviews__score">' + '<span class="revora-reviews__average">' + escapeHtml(state.averageRating.toFixed(1)) + "</span>" + '<div class="revora-reviews__stars" aria-label="' + state.averageRating + ' out of 5 stars">' + renderStars(state.averageRating) + "</div>" + "</div>" + '<p class="revora-reviews__count">' + escapeHtml(formatCount(i18n.count, state.count)) + "</p>" + "</div>" + renderToolbar(i18n, state.sort, state.photosOnly, showForm) + (showForm ? renderWriteForm(i18n, state.selectedScore) : "") + '<div class="revora-reviews__list">' + (reviews.length ? reviews.map((review) => renderReview(review, i18n, state.voted)).join("") : `<p class="revora-reviews__empty">${escapeHtml(i18n.empty)}</p>`) + "</div>" + "</div>";
  }

  // lib/storefront/revora-widget.ts
  function getStateMap() {
    if (!window.__revoraWidgetState) {
      window.__revoraWidgetState = new Map;
    }
    return window.__revoraWidgetState;
  }
  function getReviewLimit(root) {
    return Number.parseInt(root.dataset.limit || "10", 10) || 10;
  }
  function loadFullWidgetReviews(root, state) {
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
      photosOnly: state.photosOnly
    }).then((data) => {
      state.allReviews = Array.isArray(data.reviews) ? data.reviews : [];
      state.count = Number(data.count) || 0;
      state.averageRating = Number(data.averageRating) || 0;
      state.loading = false;
      renderFullWidget(root, state);
    });
  }
  function bindWidgetEvents(root) {
    if (root.dataset.revoraEventsBound === "true") {
      return;
    }
    root.dataset.revoraEventsBound = "true";
    root.addEventListener("change", (event) => {
      const target = event.target;
      if (!target?.matches("[data-revora-sort]")) {
        return;
      }
      const state = getStateMap().get(root);
      if (!state) {
        return;
      }
      state.sort = target.value || "recent";
      loadFullWidgetReviews(root, state);
    });
    root.addEventListener("click", (event) => {
      const target = event.target;
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
        loadFullWidgetReviews(root, state);
        return;
      }
      if (target.closest("[data-revora-toggle-form]")) {
        root.dataset.revoraShowForm = root.dataset.revoraShowForm === "true" ? "false" : "true";
        renderFullWidget(root, state);
        return;
      }
      const scoreButton = target.closest("[data-revora-score]");
      if (scoreButton?.dataset.revoraScore) {
        state.selectedScore = Number.parseInt(scoreButton.dataset.revoraScore, 10) || 5;
        renderFullWidget(root, state);
        return;
      }
      const voteButton = target.closest("[data-revora-vote]");
      if (voteButton) {
        const reviewId = voteButton.dataset.reviewId;
        const vote = voteButton.dataset.revoraVote;
        if (!(shop && productId && reviewId && vote) || state.voted.has(reviewId)) {
          return;
        }
        voteReview(shop, reviewId, vote).then((result) => {
          state.voted.add(reviewId);
          state.allReviews = state.allReviews.map((review) => review.id === reviewId ? {
            ...review,
            helpfulCount: result.helpfulCount,
            notHelpfulCount: result.notHelpfulCount
          } : review);
          renderFullWidget(root, state);
        }).catch(() => {});
      }
    });
    root.addEventListener("submit", (event) => {
      const form = event.target?.closest("[data-revora-review-form]");
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
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      submitReview(shop, productId, {
        authorName: String(formData.get("authorName") || ""),
        authorEmail: String(formData.get("authorEmail") || ""),
        comment: String(formData.get("comment") || ""),
        score: state.selectedScore
      }).then((result) => {
        const success = form.querySelector("[data-revora-form-success]");
        if (success) {
          success.hidden = false;
          success.textContent = result.message || i18n.formSuccess;
        }
        form.reset();
        state.selectedScore = 5;
        root.dataset.revoraShowForm = "false";
        return loadFullWidgetReviews(root, state);
      }).catch((error) => {
        const success = form.querySelector("[data-revora-form-success]");
        if (success) {
          success.hidden = false;
          success.textContent = error.message;
        }
      }).finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
    });
  }
  function initRoot(root) {
    const shop = root.dataset.shop;
    const productId = root.dataset.productId;
    const mode = root.dataset.mode || "full";
    const i18n = readI18n(root);
    if (!(shop && productId)) {
      return;
    }
    injectStyles();
    renderLoading(root, i18n);
    const summaryOnly = mode === "summary";
    fetchReviews(shop, productId, {
      limit: summaryOnly ? 1 : getReviewLimit(root),
      summaryOnly,
      sort: "recent"
    }).then((data) => {
      if (summaryOnly) {
        renderSummary(root, data, i18n);
        return;
      }
      const state = {
        allReviews: Array.isArray(data.reviews) ? data.reviews : [],
        averageRating: Number(data.averageRating) || 0,
        count: Number(data.count) || 0,
        sort: "recent",
        photosOnly: false,
        selectedScore: 5,
        voted: new Set,
        loading: false
      };
      getStateMap().set(root, state);
      bindWidgetEvents(root);
      renderFullWidget(root, state);
    }).catch(() => {
      if (mode === "summary") {
        root.innerHTML = "";
        return;
      }
      const emptyI18n = readI18n(root);
      root.innerHTML = '<div class="revora-reviews"><p class="revora-reviews__empty">' + escapeHtml(emptyI18n.empty) + "</p></div>";
    });
  }
  function init() {
    const roots = document.querySelectorAll("#revora-reviews-root, .revora-reviews-root, .revora-reviews-summary-root");
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
})();
