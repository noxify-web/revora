/** Northstar landing palette tokens shared across Revora surfaces. */
export const REVORA_THEME = {
  brand: "#FF4F1A",

  text: "#0C0C0C",
  textSubdued: "#5C5A56",
  textDisabled: "#8A8A8A",
  textSuccess: "#0C5132",
  textCritical: "#8E0B21",
  textInfo: "#00527C",
  textWarning: "#5E4200",
  textOnFill: "#F6F3EE",

  border: "rgba(12, 12, 12, 0.12)",
  borderSecondary: "rgba(12, 12, 12, 0.08)",
  borderStrong: "rgba(12, 12, 12, 0.22)",

  surface: "#FFFFFF",
  surfaceSubdued: "#F6F3EE",
  surfaceHover: "#E8E4DC",

  fillBrand: "#FF4F1A",
  fillBrandHover: "#E04415",
  fillBrandActive: "#C93A10",
  fillSecondary: "#E8E4DC",
  fillSecondaryHover: "#E0DCD4",

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

const THEME_CSS_VAR_MAP = {
  brand: "--revora-brand",
  text: "--revora-text",
  textSubdued: "--revora-text-subdued",
  textDisabled: "--revora-text-disabled",
  textSuccess: "--revora-text-success",
  textCritical: "--revora-text-critical",
  textInfo: "--revora-text-info",
  textWarning: "--revora-text-warning",
  textOnFill: "--revora-text-on-fill",
  border: "--revora-border",
  borderSecondary: "--revora-border-secondary",
  borderStrong: "--revora-border-strong",
  surface: "--revora-surface",
  surfaceSubdued: "--revora-surface-subdued",
  surfaceHover: "--revora-surface-hover",
  fillBrand: "--revora-fill-brand",
  fillBrandHover: "--revora-fill-brand-hover",
  fillBrandActive: "--revora-fill-brand-active",
  fillSecondary: "--revora-fill-secondary",
  fillSecondaryHover: "--revora-fill-secondary-hover",
  success: "--revora-success",
  successSubdued: "--revora-success-subdued",
  critical: "--revora-critical",
  criticalSubdued: "--revora-critical-subdued",
  info: "--revora-info",
  infoSubdued: "--revora-info-subdued",
  warning: "--revora-warning",
  warningSubdued: "--revora-warning-subdued",
  fontFamily: "--revora-font",
  fontSizeBase: "--revora-font-size-base",
  fontSizeSmall: "--revora-font-size-small",
  fontSizeHeading: "--revora-font-size-heading",
  fontSizeTitle: "--revora-font-size-title",
  space100: "--revora-space-100",
  space200: "--revora-space-200",
  space300: "--revora-space-300",
  space400: "--revora-space-400",
  space500: "--revora-space-500",
  radiusSmall: "--revora-radius-sm",
  radiusBase: "--revora-radius",
  radiusLarge: "--revora-radius-lg",
  shadow: "--revora-shadow",
  shadowPopover: "--revora-shadow-popover",
} as const satisfies Record<keyof typeof REVORA_THEME, string>;

export function getRevoraSelectChevronDataUri() {
  const hex = REVORA_THEME.textSubdued.slice(1).toLowerCase();
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23${hex}' d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E")`;
}

export function getRevoraCssVariables() {
  const declarations = Object.entries(THEME_CSS_VAR_MAP).map(
    ([themeKey, cssVar]) => {
      const value = REVORA_THEME[themeKey as keyof typeof REVORA_THEME];
      return `${cssVar}: ${value};`;
    }
  );

  declarations.push(
    `--revora-select-chevron: ${getRevoraSelectChevronDataUri()};`
  );

  return declarations.join("\n    ");
}

export function getRevoraRootCss(selector = ":root") {
  return `${selector} {\n    ${getRevoraCssVariables()}\n  }`;
}

export function getRevoraBrandShadow(opacity: number) {
  const hex = REVORA_THEME.brand.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function getRevoraConnectPageStyles() {
  const t = REVORA_THEME;

  return `
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: ${t.surfaceSubdued};
        color: ${t.text};
      }
      main {
        width: min(420px, calc(100vw - 32px));
        padding: 28px;
        border-radius: 16px;
        background: ${t.surface};
        border: 1px solid ${t.border};
        box-shadow: 0 12px 40px ${getRevoraBrandShadow(0.12)};
      }
      .connect-brand {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }
      .connect-brand img {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        object-fit: contain;
      }
      .connect-brand-copy h1 {
        margin: 0 0 4px;
        font-size: 22px;
      }
      .connect-brand-copy p {
        margin: 0;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      p {
        margin: 0 0 16px;
        color: ${t.textSubdued};
        line-height: 1.5;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid ${t.borderStrong};
        font-size: 14px;
      }
      button {
        width: 100%;
        margin-top: 14px;
        padding: 12px 14px;
        border: 0;
        border-radius: 10px;
        background: ${t.fillBrand};
        color: ${t.textOnFill};
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
    `;
}

export { getRevoraReviewsWidgetCss } from "./theme-storefront";
