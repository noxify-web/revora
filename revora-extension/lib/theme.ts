export {
  getRevoraBrandShadow,
  getRevoraCssVariables,
  getRevoraRootCss,
  getRevoraSelectChevronDataUri,
  REVORA_THEME,
} from "@revora/shared/theme";

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
