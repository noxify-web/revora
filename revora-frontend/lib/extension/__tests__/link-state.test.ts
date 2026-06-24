// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveExtensionLinkState } from "../link-state";

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: vi.fn(),
  readAdminJson: vi.fn(),
}));

import { adminFetch, readAdminJson } from "@/lib/admin-fetch";

const ADMIN_ORIGIN = "https://admin.shopify.com";

describe("resolveExtensionLinkState", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.revoraExtensionInstalled;
    vi.stubGlobal("crypto", {
      randomUUID: () => "fast-check-request-id",
    });
    vi.mocked(adminFetch).mockReset();
    vi.mocked(readAdminJson).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns linked immediately when the extension reports paired", async () => {
    document.documentElement.dataset.revoraExtensionInstalled = "1";

    vi.mocked(adminFetch).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const statusPromise = resolveExtensionLinkState();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "fast-check-request-id",
          installed: true,
          paired: true,
          verified: false,
          shop: "demo.myshopify.com",
        },
      })
    );

    await expect(statusPromise).resolves.toEqual({
      linked: true,
      status: {
        installed: true,
        paired: true,
        verified: false,
        shop: "demo.myshopify.com",
      },
    });
  });

  it("falls back to the server token without waiting for long retries", async () => {
    vi.useFakeTimers();

    document.documentElement.dataset.revoraExtensionInstalled = "1";
    vi.mocked(adminFetch).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      tokens: [{ id: "token-1" }],
    });

    const statusPromise = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(900);

    await expect(statusPromise).resolves.toEqual({
      linked: true,
      status: {
        installed: true,
        paired: false,
        verified: false,
        shop: null,
      },
    });

    vi.useRealTimers();
  });

  it("deduplicates concurrent fast checks", async () => {
    vi.useFakeTimers();

    const parentPostMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: parentPostMessage },
    });

    vi.mocked(adminFetch).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const first = resolveExtensionLinkState();
    const second = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(900);

    await Promise.all([first, second]);

    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(
      {
        type: "REVORA_REQUEST_EXTENSION_STATUS",
        requestId: "fast-check-request-id",
      },
      ADMIN_ORIGIN
    );

    vi.useRealTimers();
  });
});
