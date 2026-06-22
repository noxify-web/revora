/** Polaris-aligned tokens used across Revora admin and the Chrome extension. */
export const REVORA_THEME = {
  brand: "#FB7701",

  text: "#303030",
  textSubdued: "#616161",
  textDisabled: "#8A8A8A",
  textSuccess: "#0C5132",
  textCritical: "#8E0B21",
  textInfo: "#00527C",
  textWarning: "#5E4200",
  textOnFill: "#FFFFFF",

  border: "#E3E3E3",
  borderSecondary: "#EBEBEB",
  borderStrong: "#C9C9C9",

  surface: "#FFFFFF",
  surfaceSubdued: "#F7F7F7",
  surfaceHover: "#F1F1F1",

  fillBrand: "#303030",
  fillBrandHover: "#1A1A1A",
  fillBrandActive: "#000000",
  fillSecondary: "#F1F1F1",
  fillSecondaryHover: "#EBEBEB",

  success: "#29845A",
  successSubdued: "#CDFEE1",
  critical: "#E51C00",
  criticalSubdued: "#FFF1F0",
  info: "#005BD3",
  infoSubdued: "#EAF4FF",
  warning: "#B98900",
  warningSubdued: "#FFF5EA",

  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizeBase: "13px",
  fontSizeSmall: "12px",
  fontSizeHeading: "14px",
  fontSizeTitle: "16px",

  space100: "4px",
  space200: "8px",
  space300: "12px",
  space400: "16px",
  space500: "20px",

  radiusSmall: "5px",
  radiusBase: "5px",
  radiusLarge: "5px",

  shadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
  shadowPopover: "0 4px 16px rgba(0, 0, 0, 0.12)",
} as const;

/** Same Inter variable font Shopify Polaris serves from cdn.shopify.com/static/fonts/inter/v4 */
export function getInterFontFace(fontUrl: string) {
  return `
    @font-face {
      font-family: Inter;
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("${fontUrl}") format("woff2");
    }
  `;
}

export function getRevoraCssVariables() {
  const t = REVORA_THEME;

  return `
    --revora-brand: ${t.brand};
    --revora-text: ${t.text};
    --revora-text-subdued: ${t.textSubdued};
    --revora-text-disabled: ${t.textDisabled};
    --revora-text-success: ${t.textSuccess};
    --revora-text-critical: ${t.textCritical};
    --revora-text-info: ${t.textInfo};
    --revora-text-warning: ${t.textWarning};
    --revora-text-on-fill: ${t.textOnFill};
    --revora-border: ${t.border};
    --revora-border-secondary: ${t.borderSecondary};
    --revora-border-strong: ${t.borderStrong};
    --revora-surface: ${t.surface};
    --revora-surface-subdued: ${t.surfaceSubdued};
    --revora-surface-hover: ${t.surfaceHover};
    --revora-fill-brand: ${t.fillBrand};
    --revora-fill-brand-hover: ${t.fillBrandHover};
    --revora-fill-brand-active: ${t.fillBrandActive};
    --revora-fill-secondary: ${t.fillSecondary};
    --revora-fill-secondary-hover: ${t.fillSecondaryHover};
    --revora-success: ${t.success};
    --revora-success-subdued: ${t.successSubdued};
    --revora-critical: ${t.critical};
    --revora-critical-subdued: ${t.criticalSubdued};
    --revora-info: ${t.info};
    --revora-info-subdued: ${t.infoSubdued};
    --revora-warning: ${t.warning};
    --revora-warning-subdued: ${t.warningSubdued};
    --revora-font: ${t.fontFamily};
    --revora-font-size-base: ${t.fontSizeBase};
    --revora-font-size-small: ${t.fontSizeSmall};
    --revora-font-size-heading: ${t.fontSizeHeading};
    --revora-font-size-title: ${t.fontSizeTitle};
    --revora-space-100: ${t.space100};
    --revora-space-200: ${t.space200};
    --revora-space-300: ${t.space300};
    --revora-space-400: ${t.space400};
    --revora-space-500: ${t.space500};
    --revora-radius-sm: ${t.radiusSmall};
    --revora-radius: ${t.radiusBase};
    --revora-radius-lg: ${t.radiusLarge};
    --revora-shadow: ${t.shadow};
    --revora-shadow-popover: ${t.shadowPopover};
  `;
}
