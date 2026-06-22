export function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id)
  } catch {
    return false
  }
}

export function sendRuntimeMessage<T = unknown>(message: unknown) {
  if (!isExtensionContextValid()) {
    return Promise.resolve(undefined as T)
  }

  try {
    return chrome.runtime.sendMessage(message) as Promise<T>
  } catch {
    return Promise.resolve(undefined as T)
  }
}

export function sendRuntimeMessageSafe(message: unknown) {
  return sendRuntimeMessage(message).catch(() => undefined)
}