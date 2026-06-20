import type {
  BackgroundUploadResponse,
  BackgroundVerifyResponse,
} from "@revora/shared/extension-messages"
import { importBatchSchema } from "@revora/shared/extension-schemas"
import { mapTemuReview } from "../review-mapper"
import {
  BATCH_SIZE,
  DIALOG_WAIT_MS,
  MAX_IDLE_ROUNDS,
  SCROLL_INTERVAL_MS,
  extractGoodsId,
  getProductTitle,
  sendRuntimeMessage,
  sleep,
  state,
} from "./shared"
import {
  getImportFilter,
  getImportLimit,
  getSelectedProduct,
  refreshPlan,
  setButtons,
  setProgress,
  setStatus,
} from "./panel"
import {
  activatePhotosVideosTab,
  clickReviewEntryPoints,
  getFilterLabel,
  resetCollection,
  scrollReviewsPanel,
  shouldStopCollecting,
  waitForReviewsDialog,
} from "./scraper"

export async function flushUploads({
  final = false,
  product,
  goodsId,
}: {
  final?: boolean
  product: { id: string; title: string }
  goodsId: string
} = {
  final: false,
  product: { id: "", title: "" },
  goodsId: "",
}) {
  const allReviews = Array.from(state.reviews.values()).filter(
    (review) => !state.uploadedIds.has(String(review.review_id)),
  )

  if (!allReviews.length && !final) {
    return
  }

  const chunks: (typeof allReviews)[] = []
  for (let i = 0; i < allReviews.length; i += BATCH_SIZE) {
    chunks.push(allReviews.slice(i, i + BATCH_SIZE))
  }

  if (!chunks.length && final) {
    chunks.push([])
  }

  let batchIndex = 0
  for (const chunk of chunks) {
    const mappedReviews = chunk.map(mapTemuReview)
    const body = {
      importId: state.importId || undefined,
      temuGoodsId: goodsId,
      temuProductUrl: window.location.href,
      temuProductTitle: getProductTitle(),
      shopifyProductId: product.id,
      shopifyProductTitle: product.title,
      totalExpected: state.maxListSize || undefined,
      batchIndex,
      isFinal: final && batchIndex === chunks.length - 1,
      reviews: mappedReviews,
    }

    importBatchSchema.parse(body)

    const response = await sendRuntimeMessage<BackgroundUploadResponse>({
      type: "REVORA_UPLOAD_BATCH",
      importId: state.importId,
      temuGoodsId: goodsId,
      temuProductUrl: window.location.href,
      temuProductTitle: getProductTitle(),
      shopifyProductId: product.id,
      shopifyProductTitle: product.title,
      totalExpected: state.maxListSize,
      batchIndex,
      isFinal: final && batchIndex === chunks.length - 1,
      reviews: chunk,
    })

    if (!response?.ok) {
      throw new Error(response?.error || "Upload failed")
    }

    state.importId = response.data?.importId || state.importId

    for (const review of chunk) {
      state.uploadedIds.add(String(review.review_id))
    }

    if (response.data?.limitReached) {
      state.limitReached = true
    }

    const limitSuffix =
      state.reviewLimit != null ? ` / ${state.reviewLimit}` : ""
    setStatus(`Uploaded ${state.uploadedIds.size}${limitSuffix} reviews`)

    if (state.limitReached) {
      break
    }

    batchIndex += 1
  }
}

export async function startImport() {
  if (state.collecting) return

  const goodsId = extractGoodsId()
  if (!goodsId) {
    setStatus("Open a Temu product page first")
    return
  }

  const product = getSelectedProduct()
  if (!product.id) {
    setStatus("Select a Shopify product before importing")
    return
  }

  let verify: BackgroundVerifyResponse
  try {
    verify = await sendRuntimeMessage<BackgroundVerifyResponse>({
      type: "REVORA_VERIFY",
    })
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Extension is not paired")
    return
  }

  if (!verify.ok) {
    setStatus(verify.error || "Extension is not paired")
    return
  }

  await refreshPlan()
  resetCollection()
  state.collecting = true
  setButtons(true)
  setStatus("Opening reviews and collecting...")

  const opened = await clickReviewEntryPoints(setStatus)
  setStatus(
    opened
      ? "Waiting for reviews panel..."
      : "Looking for an open reviews panel...",
  )

  const dialog = await waitForReviewsDialog(opened ? DIALOG_WAIT_MS : 2500)
  if (!dialog) {
    setStatus(
      opened
        ? "Reviews panel did not open. Click 'See all reviews' on Temu, then click Import again."
        : "Could not find reviews panel. Click 'See all reviews' on Temu, or set the button selector in the extension popup.",
    )
  } else if (!state.scrollContainer) {
    setStatus("Reviews panel open, but scroll area not found yet...")
  } else {
    setStatus("Reviews panel open — collecting...")
  }

  await sleep(800)

  const filter = getImportFilter()
  const limit = getImportLimit()
  const filterLabel = getFilterLabel(filter)
  const idleRoundsLimit = filter === "withText" ? 20 : MAX_IDLE_ROUNDS

  if (filter === "withPictures" && dialog) {
    setStatus("Opening Photos/Videos tab...")
    const openedPhotosTab = await activatePhotosVideosTab(dialog)

    if (!openedPhotosTab) {
      setStatus(
        "Photos/Videos tab not found — collecting all reviews and keeping ones with media...",
      )
    } else {
      setStatus("Photos/Videos tab open — collecting...")
    }
  }

  while (state.collecting) {
    scrollReviewsPanel()
    await sleep(SCROLL_INTERVAL_MS)

    if (shouldStopCollecting(limit, filter)) {
      break
    }

    state.idleRounds += 1
    if (state.idleRounds >= idleRoundsLimit) {
      break
    }
  }

  try {
    if (state.reviews.size === 0) {
      setStatus(
        filter === "all"
          ? "No reviews captured yet. Open the full reviews panel on Temu, then click Import again."
          : `No reviews ${filterLabel} captured yet. Try a different filter or scroll the panel manually first.`,
      )
      return
    }

    const reviewsToUpload = state.reviewLimit
      ? Array.from(state.reviews.values()).slice(0, state.reviewLimit)
      : Array.from(state.reviews.values())

    if (state.reviewLimit && reviewsToUpload.length < state.reviews.size) {
      state.reviews = new Map(
        reviewsToUpload.map((review) => [String(review.review_id), review]),
      )
      setStatus(
        `Free plan limit reached — uploading first ${state.reviewLimit} reviews...`,
      )
    } else {
      setStatus(`Uploading ${state.reviews.size} reviews ${filterLabel}...`)
    }

    await flushUploads({ final: true, product, goodsId })
    const progressTotal =
      state.reviewLimit || state.maxListSize || state.uploadedIds.size
    setProgress(state.uploadedIds.size, progressTotal)

    const limitMessage = state.limitReached
      ? ` Free plan limit (${state.reviewLimit}) reached — upgrade in Revora admin for unlimited imports.`
      : ""
    setStatus(
      `Import complete (${state.uploadedIds.size} reviews ${filterLabel} uploaded).${limitMessage}`,
    )
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Import failed")
  } finally {
    state.collecting = false
    setButtons(false)
  }
}

export function stopImport(reason: string) {
  state.collecting = false
  setButtons(false)
  setStatus(reason)
}