const ADMIN_URL_PARAM_BLOCKLIST = new Set(["id_token"]);
const SESSION_RETRY_WAIT_ATTEMPTS = [10, 20, 30] as const;
const SESSION_CONNECT_WAIT_ATTEMPTS = 40;
const SESSION_CONNECT_WAIT_DELAY_MS = 300;

function buildAdminRequest(
  path: string,
  init: RequestInit | undefined,
  token: string | null
) {
  const url = new URL(path, window.location.origin);
  const pageParams = new URLSearchParams(window.location.search);

  pageParams.forEach((value, key) => {
    if (ADMIN_URL_PARAM_BLOCKLIST.has(key)) {
      return;
    }

    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });

  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const search = url.searchParams.toString();

  return {
    url: search ? `${url.pathname}?${search}` : url.pathname,
    init: {
      ...init,
      headers,
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedPageIdToken: string | null = null;

export function captureIdTokenFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const token = new URLSearchParams(window.location.search).get("id_token");
  if (token?.trim()) {
    cachedPageIdToken = token.trim();
  }
}

if (typeof window !== "undefined") {
  captureIdTokenFromUrl();
}

const ID_TOKEN_CALL_TIMEOUT_MS = 1500;

async function requestShopifyIdToken(): Promise<string | null> {
  if (typeof window === "undefined" || !window.shopify?.idToken) {
    return null;
  }

  try {
    const token = await Promise.race([
      window.shopify.idToken(),
      sleep(ID_TOKEN_CALL_TIMEOUT_MS).then(() => null),
    ]);

    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

async function readShopifyIdToken(waitAttempts: number) {
  for (let attempt = 0; attempt < waitAttempts; attempt += 1) {
    if (cachedPageIdToken) {
      return cachedPageIdToken;
    }

    const token = await requestShopifyIdToken();
    if (token) {
      cachedPageIdToken = token;
      return token;
    }

    if (attempt < waitAttempts - 1) {
      await sleep(200);
    }
  }

  return cachedPageIdToken;
}

export function stripStaleIdTokenFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  captureIdTokenFromUrl();

  const params = new URLSearchParams(window.location.search);
  if (!params.has("id_token")) {
    return;
  }

  params.delete("id_token");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function redirectToSessionBounce() {
  const params = new URLSearchParams(window.location.search);
  params.delete("id_token");

  const reloadPath = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  const bounceParams = new URLSearchParams(params);
  bounceParams.set("shopify-reload", reloadPath);

  window.location.assign(`/session-token-bounce?${bounceParams.toString()}`);
}

let sessionBounceSuspended = 0;
const SESSION_BOUNCE_SUSPEND_RETRY_ATTEMPTS = 20;
const SESSION_BOUNCE_SUSPEND_RETRY_DELAY_MS = 400;

export function suspendSessionBounce() {
  sessionBounceSuspended += 1;
}

export function resumeSessionBounce() {
  sessionBounceSuspended = Math.max(0, sessionBounceSuspended - 1);
}

export function isSessionBounceSuspended() {
  return sessionBounceSuspended > 0;
}

export async function runWithoutSessionBounce<T>(
  fn: () => Promise<T>
): Promise<T> {
  suspendSessionBounce();

  try {
    return await fn();
  } finally {
    resumeSessionBounce();
  }
}

let inflightSessionToken: Promise<string | null> | null = null;

export function getSessionToken(retryAttempt = 0) {
  const waitAttempts =
    SESSION_RETRY_WAIT_ATTEMPTS[retryAttempt] ??
    SESSION_RETRY_WAIT_ATTEMPTS.at(-1);

  if (retryAttempt === 0) {
    if (!inflightSessionToken) {
      inflightSessionToken = readShopifyIdToken(waitAttempts).finally(() => {
        inflightSessionToken = null;
      });
    }

    return inflightSessionToken;
  }

  return readShopifyIdToken(waitAttempts);
}

/** Always reads a fresh token (no inflight dedupe). Used for connect flows. */
export function getSessionTokenFresh(waitAttempts = 5) {
  return readShopifyIdToken(waitAttempts);
}

export async function waitForAdminSession(
  maxWaitMs = 20_000
): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    const waitAttempts = Math.min(5 + attempt * 2, 30);
    const token = await getSessionTokenFresh(waitAttempts);

    if (token) {
      return token;
    }

    attempt += 1;
    await sleep(SESSION_CONNECT_WAIT_DELAY_MS);
  }

  return null;
}

/** Fetch with a fixed session token and never redirect to session-token-bounce. */
export async function adminFetchNoBounce(
  path: string,
  init?: RequestInit,
  sessionToken?: string | null
): Promise<Response | null> {
  const token = sessionToken ?? (await getSessionTokenFresh());

  if (!token) {
    return null;
  }

  const request = buildAdminRequest(path, init, token);
  const response = await fetch(request.url, request.init);

  // Stale cached id_token — clear it and retry once with a fresh token from
  // App Bridge. Without this, every adminFetchNoBounce call 401s forever
  // after the cached token expires (the caller never clears the cache).
  if (response.status === 401 && !sessionToken) {
    cachedPageIdToken = null;
    const freshToken = await getSessionTokenFresh();

    if (freshToken && freshToken !== token) {
      const retryRequest = buildAdminRequest(path, init, freshToken);
      return fetch(retryRequest.url, retryRequest.init);
    }
  }

  return response;
}

export async function adminFetch(
  path: string,
  init?: RequestInit,
  attempt = 0
): Promise<Response> {
  const token = await getSessionToken(attempt);

  if (!token) {
    if (sessionBounceSuspended > 0) {
      if (attempt < SESSION_BOUNCE_SUSPEND_RETRY_ATTEMPTS) {
        await sleep(SESSION_BOUNCE_SUSPEND_RETRY_DELAY_MS);
        return adminFetch(path, init, attempt + 1);
      }

      throw new Error(
        "Shopify session is still loading. Wait a moment, then try again."
      );
    }

    if (attempt < 2) {
      return adminFetch(path, init, attempt + 1);
    }

    redirectToSessionBounce();
    throw new Error("Session expired. Reload Revora from Shopify admin.");
  }

  const request = buildAdminRequest(path, init, token);
  const response = await fetch(request.url, request.init);

  if (response.status === 401) {
    cachedPageIdToken = null;

    if (sessionBounceSuspended > 0) {
      if (attempt < SESSION_BOUNCE_SUSPEND_RETRY_ATTEMPTS) {
        await sleep(SESSION_BOUNCE_SUSPEND_RETRY_DELAY_MS);
        return adminFetch(path, init, attempt + 1);
      }

      throw new Error(
        "Shopify session is still loading. Wait a moment, then try again."
      );
    }

    if (attempt < 2) {
      return adminFetch(path, init, attempt + 1);
    }

    redirectToSessionBounce();
    throw new Error("Session expired. Reload Revora from Shopify admin.");
  }

  return response;
}

export async function readAdminJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 401
        ? "Session expired. Reload Revora from Shopify admin."
        : "Unexpected server response. Try again."
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Unexpected server response. Try again.");
  }
}

export async function adminFetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await adminFetch(path, init);
  const data = await readAdminJson<T & { error?: string }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export async function adminFetchUntilSession(
  path: string,
  init?: RequestInit,
  options: {
    attempts?: number;
    delayMs?: number;
  } = {}
): Promise<Response> {
  const {
    attempts = SESSION_CONNECT_WAIT_ATTEMPTS,
    delayMs = SESSION_CONNECT_WAIT_DELAY_MS,
  } = options;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const token = await getSessionTokenFresh(Math.min(5 + attempt, 20));

    if (!token) {
      if (attempt < attempts - 1) {
        await sleep(delayMs);
        continue;
      }

      throw new Error(
        "Shopify session is still loading. Wait a moment, then click Connect again."
      );
    }

    const request = buildAdminRequest(path, init, token);
    const response = await fetch(request.url, request.init);

    if (response.status === 401) {
      cachedPageIdToken = null;

      if (attempt < attempts - 1) {
        await sleep(delayMs);
        continue;
      }

      throw new Error(
        "Shopify session is still loading. Wait a moment, then click Connect again."
      );
    }

    return response;
  }

  throw new Error(
    "Shopify session is still loading. Wait a moment, then click Connect again."
  );
}
