import { REVORA_LOGO_EXTENSION_FILE } from "@revora/shared";

export function getRevoraLogoUrl() {
  return chrome.runtime.getURL(REVORA_LOGO_EXTENSION_FILE);
}

export function revoraLogoImg({
  className,
  size,
}: {
  className: string;
  size: number;
}) {
  const url = getRevoraLogoUrl();

  return `<img class="${className}" src="${url}" alt="" width="${size}" height="${size}" aria-hidden="true" decoding="async" />`;
}
