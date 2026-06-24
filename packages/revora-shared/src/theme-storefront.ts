/**
 * Storefront widget palette — subset of REVORA_THEME in theme.ts.
 * Keep brand/surface/text tokens in sync when the Northstar palette changes.
 */
export const REVORA_WIDGET_PALETTE = {
  brand: "#FF4F1A",
  text: "#0C0C0C",
  textSubdued: "#5C5A56",
  surfaceSubdued: "#F6F3EE",
  surfaceHover: "#E8E4DC",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  success: "#1F7A4D",
} as const;

export function getRevoraReviewsWidgetCss() {
  const border = REVORA_WIDGET_PALETTE.border;
  const text = REVORA_WIDGET_PALETTE.text.toLowerCase();
  const textSubdued = REVORA_WIDGET_PALETTE.textSubdued.toLowerCase();
  const brand = REVORA_WIDGET_PALETTE.brand.toLowerCase();
  const surfaceSubdued = REVORA_WIDGET_PALETTE.surfaceSubdued.toLowerCase();
  const surface = REVORA_WIDGET_PALETTE.surface.toLowerCase();
  const success = REVORA_WIDGET_PALETTE.success.toLowerCase();

  return (
    `.revora-reviews{border:1px solid ${border};border-radius:14px;padding:20px;background:${surfaceSubdued};color:${text}}` +
    ".revora-reviews--loading{opacity:.85}" +
    ".revora-reviews__header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}" +
    ".revora-reviews__score{display:flex;align-items:center;gap:10px}" +
    `.revora-reviews__average{font-size:28px;font-weight:700;color:${brand}}` +
    ".revora-reviews__stars,.revora-reviews__item-score,.revora-reviews__summary-stars{display:inline-flex;gap:2px;align-items:center}" +
    `.revora-reviews__star{color:${border};font-size:14px;line-height:1}` +
    `.revora-reviews__star.is-filled{color:${brand}}` +
    `.revora-reviews__count,.revora-reviews__date,.revora-reviews__empty,.revora-reviews__meta{color:${textSubdued};font-size:14px}` +
    ".revora-reviews__toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}" +
    `.revora-reviews__select,.revora-reviews__input,.revora-reviews__textarea{border:1px solid ${border};border-radius:8px;padding:8px 10px;background:${surface};color:${text};font:inherit}` +
    ".revora-reviews__textarea{min-height:96px;resize:vertical;width:100%}" +
    `.revora-reviews__button{border:1px solid ${border};border-radius:999px;padding:8px 14px;background:${surface};color:${text};font:inherit;cursor:pointer}` +
    `.revora-reviews__button:hover{background:${surfaceSubdued}}` +
    `.revora-reviews__button.is-primary{background:${brand};border-color:${brand};color:#fff}` +
    ".revora-reviews__button.is-primary:hover{filter:brightness(.95)}" +
    `.revora-reviews__button.is-active{background:${brand};border-color:${brand};color:#fff}` +
    ".revora-reviews__list{display:grid;gap:14px}" +
    `.revora-reviews__item{border-top:1px solid ${border};padding-top:14px}` +
    ".revora-reviews__item-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;flex-wrap:wrap}" +
    ".revora-reviews__comment{margin:8px 0 0;line-height:1.5;white-space:pre-wrap}" +
    ".revora-reviews__photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
    `.revora-reviews__photos img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid ${border}}` +
    ".revora-reviews__votes{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}" +
    ".revora-reviews__form{display:grid;gap:10px;margin-top:18px;padding-top:18px;border-top:1px solid " +
    border +
    "}" +
    ".revora-reviews__form-row{display:grid;gap:10px}" +
    "@media(min-width:640px){.revora-reviews__form-row{grid-template-columns:1fr 1fr}}" +
    ".revora-reviews__star-input{display:inline-flex;gap:4px}" +
    `.revora-reviews__star-input button{border:none;background:transparent;color:${border};font-size:22px;cursor:pointer;padding:0}` +
    `.revora-reviews__star-input button.is-filled{color:${brand}}` +
    `.revora-reviews__success{color:${success};font-size:14px}` +
    ".revora-reviews-summary{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}" +
    `.revora-reviews-summary__average{font-weight:700;color:${text};font-size:14px}` +
    `.revora-reviews-summary__count{color:${textSubdued};font-size:13px}` +
    `.revora-reviews-summary__link{color:${brand};font-size:13px;text-decoration:none}` +
    ".revora-reviews-summary__link:hover{text-decoration:underline}" +
    ".revora-reviews-summary .revora-reviews__star{font-size:13px}"
  );
}
