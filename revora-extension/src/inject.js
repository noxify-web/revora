;(function () {
  const MESSAGE_TYPE = "REVORA_TEMU_REVIEWS"

  function publish(url, payload) {
    window.postMessage(
      {
        source: "revora-extension",
        type: MESSAGE_TYPE,
        url,
        payload,
      },
      "*",
    )
  }

  function handleReviewsResponse(url, data) {
    if (!data || !Array.isArray(data.data)) {
      return
    }

    publish(url, {
      reviews: data.data,
      maxListSize: data.max_list_size ?? null,
      page: extractPage(url),
      goodsId: extractGoodsId(url),
    })
  }

  function extractPage(url) {
    try {
      return Number(new URL(url, window.location.origin).searchParams.get("page") || "1")
    } catch {
      return null
    }
  }

  function extractGoodsId(url) {
    try {
      return new URL(url, window.location.origin).searchParams.get("goods_id")
    } catch {
      return null
    }
  }

  function isReviewsEndpoint(url) {
    return typeof url === "string" && url.includes("/api/bg/engels/reviews/list")
  }

  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)
    const requestUrl =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : ""

    if (isReviewsEndpoint(requestUrl)) {
      response
        .clone()
        .json()
        .then((data) => handleReviewsResponse(requestUrl, data))
        .catch(() => {})
    }

    return response
  }

  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__revoraUrl = url
    return originalOpen.call(this, method, url, ...rest)
  }

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      const url = this.__revoraUrl
      if (!isReviewsEndpoint(url) || this.responseType === "arraybuffer") {
        return
      }

      try {
        const data =
          typeof this.response === "string"
            ? JSON.parse(this.response)
            : this.response
        handleReviewsResponse(url, data)
      } catch {
        // Ignore malformed responses.
      }
    })

    return originalSend.apply(this, args)
  }
})()