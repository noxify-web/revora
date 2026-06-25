export function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function sendRuntimeMessage<T = unknown>(message: unknown) {
  if (!isExtensionContextValid()) {
    return Promise.resolve(undefined as T);
  }

  try {
    return chrome.runtime.sendMessage(message) as Promise<T>;
  } catch {
    return Promise.resolve(undefined as T);
  }
}

export function sendRuntimeMessageSafe(message: unknown) {
  return sendRuntimeMessage(message).catch(() => undefined);
}

/**
 * Race a promise against a timeout. Rejects with a descriptive error if the
 * timeout fires first. Shared by admin-tabs / popup / admin-bridge so the
 * timeout wrapper isn't copy-pasted across files.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Revora request timed out. Try again."
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        globalThis.clearTimeout(timer);
        reject(error);
      });
  });
}
