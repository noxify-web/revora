/** Connect token fields persisted on `document.documentElement` dataset attributes. */
export interface ConnectTokenDomPayload {
  apiUrl: string;
  shop: string;
  token: string;
}

export function normalizeConnectApiUrl(apiUrl: string) {
  return apiUrl.replace(/\/$/, "");
}

export function readConnectTokenDom(
  doc: Document = document
): ConnectTokenDomPayload | null {
  const token = doc.documentElement.dataset.revoraConnectToken?.trim();
  const apiUrl = doc.documentElement.dataset.revoraApiUrl?.trim();
  const shop = doc.documentElement.dataset.revoraShop?.trim();

  if (!(token && apiUrl && shop)) {
    return null;
  }

  return {
    token,
    apiUrl: normalizeConnectApiUrl(apiUrl),
    shop,
  };
}

export function writeConnectTokenDom(
  payload: ConnectTokenDomPayload,
  doc: Document = document
) {
  doc.documentElement.dataset.revoraConnectToken = payload.token;
  doc.documentElement.dataset.revoraApiUrl = payload.apiUrl;
  doc.documentElement.dataset.revoraShop = payload.shop;
}

export function clearConnectTokenDom(doc: Document = document) {
  delete doc.documentElement.dataset.revoraConnectToken;
  delete doc.documentElement.dataset.revoraApiUrl;
  delete doc.documentElement.dataset.revoraShop;
}
