import { getRevoraRootCss } from "@revora/shared/theme";

const THEME_STYLE_ID = "revora-theme-vars";

export function injectRevoraRootTheme(doc: Document = document) {
  if (doc.getElementById(THEME_STYLE_ID)) {
    return;
  }

  const style = doc.createElement("style");
  style.id = THEME_STYLE_ID;
  style.textContent = getRevoraRootCss();
  doc.head.prepend(style);
}
