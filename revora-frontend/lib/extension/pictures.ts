export function normalizePictureUrl(item: unknown): string | null {
  if (typeof item === "string") {
    const trimmed = item.trim()
    return trimmed || null
  }

  if (item && typeof item === "object" && "url" in item) {
    const url = (item as { url?: unknown }).url
    return typeof url === "string" && url.trim() ? url.trim() : null
  }

  return null
}

export function normalizePictureUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(normalizePictureUrl).filter((url): url is string => Boolean(url))
}

export function parseStoredPictures(value: string | null): string[] {
  if (!value) return []

  try {
    return normalizePictureUrls(JSON.parse(value))
  } catch {
    return []
  }
}

export function serializePictures(urls: string[]): string | null {
  return urls.length ? JSON.stringify(urls) : null
}
