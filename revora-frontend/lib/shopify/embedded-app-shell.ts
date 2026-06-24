/**
 * Embedded Shopify admin shell styles.
 * CSS-only: no JS boot gate (avoids hydration races and infinite loading).
 */
export const EMBEDDED_APP_SHELL_STYLES = `
s-app-nav {
  display: none;
}

#revora-polaris-shell {
  align-items: center;
  animation: revora-hide-shell 0s 2s forwards;
  box-sizing: border-box;
  color: #616161;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  justify-content: center;
  line-height: 1.25rem;
  min-height: 12rem;
  padding: 1.5rem;
}

#revora-polaris-shell::before {
  animation: revora-polaris-spin 0.8s linear infinite;
  border: 2px solid #e3e3e3;
  border-radius: 50%;
  border-top-color: #8a8a8a;
  content: "";
  height: 1.25rem;
  margin-right: 0.625rem;
  width: 1.25rem;
}

@keyframes revora-polaris-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes revora-hide-shell {
  to {
    display: none;
  }
}

@keyframes revora-reveal-app {
  to {
    display: block;
  }
}

[data-revora-app] {
  animation: revora-reveal-app 0s 2s forwards;
  display: none;
}

body:has(s-page:defined) #revora-polaris-shell {
  animation: none;
  display: none;
}

body:has(s-page:defined) [data-revora-app] {
  animation: none;
  display: block;
}

s-page:not(:defined) {
  display: none !important;
}
`;

/** Static nav for plain HTML shells (session-token bounce). */
export const APP_NAV_HTML =
  '<s-app-nav><s-link href="/" rel="home">Dashboard</s-link><s-link href="/reviews">Reviews</s-link><s-link href="/export">Export</s-link></s-app-nav>';
