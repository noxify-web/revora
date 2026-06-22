const ADMIN_URL_PARAM_BLOCKLIST = new Set(["id_token"]);
const SESSION_RETRY_WAIT_ATTEMPTS = [10, 20, 30] as const;

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

async function readShopifyIdToken(waitAttempts: number) {
  for (let attempt = 0; attempt < waitAttempts; attempt += 1) {
    if (typeof window !== "undefined" && window.shopify?.idToken) {
      try {
        const token = await window.shopify.idToken();
        if (token) {
          return token;
        }
      } catch {
        // App Bridge may not be ready yet.
      }
    }

    if (attempt < waitAttempts - 1) {
      await sleep(200);
    }
  }

  return null;
}

export function stripStaleIdTokenFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

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

export function getSessionToken(retryAttempt = 0) {
  const waitAttempts =
    SESSION_RETRY_WAIT_ATTEMPTS[retryAttempt] ??
    SESSION_RETRY_WAIT_ATTEMPTS.at(-1);

  return readShopifyIdToken(waitAttempts);
}

export async function adminFetch(
  path: string,
  init?: RequestInit,
  attempt = 0
): Promise<Response> {
  const token = await getSessionToken(attempt);

  if (!token) {
    if (attempt < 2) {
      return adminFetch(path, init, attempt + 1);
    }

    redirectToSessionBounce();
    throw new Error("Session expired. Reload Revora from Shopify admin.");
  }

  const request = await buildAdminRequest(path, init, token);
  const response = await fetch(request.url, request.init);

  if (response.status === 401 && attempt < 2) {
    return adminFetch(path, init, attempt + 1);
  }

  if (response.status === 401) {
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
