import { PAIRING_PREFIX } from "./constants";

export interface PairingPayload {
  apiUrl?: string;
  token: string;
}

export interface DecodedPairing {
  apiBaseUrl: string;
  pairingToken: string;
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePairingCode({ apiUrl, token }: PairingPayload): string {
  const payload: { token: string; apiUrl?: string } = { token };

  if (apiUrl?.trim()) {
    payload.apiUrl = apiUrl.replace(/\/$/, "");
  }

  return `${PAIRING_PREFIX}${encodeBase64Utf8(JSON.stringify(payload))}`;
}

export function decodePairingCode(code: string): DecodedPairing {
  const trimmed = code.trim();

  if (trimmed.startsWith(PAIRING_PREFIX)) {
    const payload = JSON.parse(
      decodeBase64Utf8(trimmed.slice(PAIRING_PREFIX.length))
    ) as { apiUrl?: string; token?: string };

    if (!payload.token) {
      throw new Error("Invalid pairing code");
    }

    return {
      apiBaseUrl: payload.apiUrl?.replace(/\/$/, "") || "",
      pairingToken: payload.token,
    };
  }

  if (trimmed.startsWith("rvr_")) {
    return {
      apiBaseUrl: "",
      pairingToken: trimmed,
    };
  }

  throw new Error("Invalid pairing code format");
}
