import revoraLogoMarkSvg from "../public/revora-logo-transparent.svg?raw";

export function revoraBrandLogoMarkup(className: string, size = 32) {
  return revoraLogoMarkSvg
    .trim()
    .replace(
      /<svg\b[^>]*>/,
      `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 1500 1500" aria-hidden="true" focusable="false">`
    );
}
