/** Shopify admin sidebar navigation (App Bridge reads this from the iframe DOM). */
export function AppNav() {
  return (
    <s-app-nav>
      <s-link href="/" rel="home">
        Dashboard
      </s-link>
      <s-link href="/reviews">Reviews</s-link>
      <s-link href="/export">Export</s-link>
    </s-app-nav>
  );
}
