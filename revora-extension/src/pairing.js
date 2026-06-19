const PAIRING_PREFIX = "REVORA1."

export function encodePairingCode({ apiUrl, token }) {
  const payload = { token }

  if (apiUrl?.trim()) {
    payload.apiUrl = apiUrl.replace(/\/$/, "")
  }

  return `${PAIRING_PREFIX}${btoa(JSON.stringify(payload))}`
}

export function decodePairingCode(code) {
  const trimmed = code.trim()

  if (trimmed.startsWith(PAIRING_PREFIX)) {
    const payload = JSON.parse(atob(trimmed.slice(PAIRING_PREFIX.length)))

    if (!payload.token) {
      throw new Error("Invalid pairing code")
    }

    return {
      apiBaseUrl: payload.apiUrl ? payload.apiUrl.replace(/\/$/, "") : "",
      pairingToken: payload.token,
    }
  }

  if (trimmed.startsWith("rvr_")) {
    return {
      apiBaseUrl: "",
      pairingToken: trimmed,
    }
  }

  throw new Error("Invalid pairing code format")
}