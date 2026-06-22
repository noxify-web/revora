/** Raw sidebar navigation markup consumed by Shopify App Bridge. */
export const APP_NAV_HTML = `<ui-nav-menu><a href="/" rel="home">Dashboard</a><a href="/reviews">Reviews</a><a href="/export">Export</a></ui-nav-menu>`;

/** Writes nav into the document during initial HTML parse (before App Bridge scans). */
export const APP_NAV_BOOTSTRAP_SCRIPT = `document.write(${JSON.stringify(APP_NAV_HTML)});`;

/** Fallback if streaming/hydration skipped the document.write nav. */
export const APP_NAV_FALLBACK_SCRIPT = `if(!document.querySelector("ui-nav-menu")){document.body.insertAdjacentHTML("afterbegin",${JSON.stringify(APP_NAV_HTML)});}`;
