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
} as const;

export function getRevoraReviewsWidgetCss() {
  const border = REVORA_WIDGET_PALETTE.surfaceHover;
  const text = REVORA_WIDGET_PALETTE.text.toLowerCase();
  const textSubdued = REVORA_WIDGET_PALETTE.textSubdued.toLowerCase();
  const brand = REVORA_WIDGET_PALETTE.brand.toLowerCase();
  const surfaceSubdued = REVORA_WIDGET_PALETTE.surfaceSubdued.toLowerCase();

  return (
    `.revora-reviews{border:1px solid ${border};border-radius:14px;padding:20px;background:${surfaceSubdued};color:${text}}` +
    ".revora-reviews__header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}" +
    ".revora-reviews__score{display:flex;align-items:center;gap:10px}" +
    `.revora-reviews__average{font-size:28px;font-weight:700;color:${brand}}` +
    ".revora-reviews__stars,.revora-reviews__item-score{display:inline-flex;gap:2px}" +
    `.revora-reviews__star{color:${border};font-size:14px}` +
    `.revora-reviews__star.is-filled{color:${brand}}` +
    `.revora-reviews__count,.revora-reviews__date,.revora-reviews__empty{color:${textSubdued};font-size:14px}` +
    ".revora-reviews__list{display:grid;gap:14px}" +
    `.revora-reviews__item{border-top:1px solid ${border};padding-top:14px}` +
    ".revora-reviews__item-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}" +
    ".revora-reviews__comment{margin:8px 0 0;line-height:1.5}" +
    ".revora-reviews__photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
    `.revora-reviews__photos img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid ${border}}`
  );
}
