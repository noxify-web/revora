import { chromium } from "playwright"

const url =
  "https://www.temu.com/ca/1pc-portable-high-pressure-car-wash-gun-3-4-inch-and-1-2-inch-quick-connect-adapters-multifunctional-garden-hose-nozzle-adjustable-thickened-rod-spray-suitable-for-car-cleaning-and-pet-grooming-g-601099827944835.html"

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

const reviewRequests = []

page.on("request", (request) => {
  const u = request.url()
  if (u.includes("/api/bg/engels/reviews/list")) {
    reviewRequests.push(u)
  }
})

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
await page.waitForTimeout(5000)

const candidates = await page.evaluate(() => {
  const results = []

  for (const node of document.querySelectorAll("a, button, div, span")) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim()
    if (!text || text.length > 120) continue
    if (!/review|See all|all reviews|ratings/i.test(text)) continue

    const rect = node.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue

    results.push({
      tag: node.tagName,
      text: text.slice(0, 100),
      className: String(node.className || "").slice(0, 120),
      id: node.id || null,
      role: node.getAttribute("role"),
      ariaLabel: node.getAttribute("aria-label"),
      href: node instanceof HTMLAnchorElement ? node.href : null,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
    })
  }

  return results.slice(0, 40)
})

console.log("REVIEW_UI_CANDIDATES")
console.log(JSON.stringify(candidates, null, 2))
console.log("REVIEW_API_REQUESTS_ON_LOAD", reviewRequests.length)
console.log(JSON.stringify(reviewRequests.slice(0, 5), null, 2))

// Try clicking likely review entry points
const clickTargets = candidates.filter((c) =>
  /see all|all reviews|reviews for|shop reviews|\(\d+\)/i.test(c.text),
)

for (const target of clickTargets.slice(0, 5)) {
  try {
    const locator = page.getByText(target.text, { exact: false }).first()
    if (await locator.count()) {
      await locator.click({ timeout: 3000 })
      await page.waitForTimeout(3000)
      break
    }
  } catch {
    // continue
  }
}

await page.waitForTimeout(3000)

const afterClickRequests = reviewRequests.length
const modalInfo = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]')
  return {
    hasDialog: Boolean(dialog),
    dialogText: dialog?.textContent?.slice(0, 200) || null,
    scrollables: Array.from(document.querySelectorAll("*"))
      .filter((node) => {
        const style = window.getComputedStyle(node)
        return (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 100
        )
      })
      .slice(0, 5)
      .map((node) => ({
        tag: node.tagName,
        className: String(node.className || "").slice(0, 80),
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
      })),
  }
})

console.log("AFTER_CLICK_API_REQUESTS", afterClickRequests)
console.log("MODAL_INFO")
console.log(JSON.stringify(modalInfo, null, 2))

await browser.close()