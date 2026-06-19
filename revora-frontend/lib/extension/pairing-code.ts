export type PairingPayload = {
  apiUrl?: string
  token: string
}

const PAIRING_PREFIX = "REVORA1."

export function encodePairingCode({ apiUrl, token }: PairingPayload) {
  const payload: { token: string; apiUrl?: string } = { token }

  if (apiUrl?.trim()) {
    payload.apiUrl = apiUrl.replace(/\/$/, "")
  }

  return `${PAIRING_PREFIX}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64")}`
}

export function decodePairingCode(code: string): PairingPayload {
  const trimmed = code.trim()

  if (trimmed.startsWith(PAIRING_PREFIX)) {
    const payload = JSON.parse(
      Buffer.from(trimmed.slice(PAIRING_PREFIX.length), "base64").toString(
        "utf8",
      ),
    ) as { apiUrl?: string; token?: string }

    if (!payload.token) {
      throw new Error("Invalid pairing code")
    }

    return {
      apiUrl: payload.apiUrl?.replace(/\/$/, "") || "",
      token: payload.token,
    }
  }

  if (trimmed.startsWith("rvr_")) {
    return {
      apiUrl: "",
      token: trimmed,
    }
  }

  throw new Error("Invalid pairing code format")
}