// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  invalidateExtensionLinkStateCache,
  resolveExtensionLinkState,
} from "../link-state";

vi.mock("@/lib/admin-fetch", () => ({
  adminFetchNoBounce: vi.fn(),
  adminFetchUntilSession: vi.fn(),
  readAdminJson: vi.fn(),
}));

import { adminFetchNoBounce, readAdminJson } from "@/lib/admin-fetch";

const ADMIN_ORIGIN = "https://admin.shopify.com";

describe("resolveExtensionLinkState", () => {
  beforeEach(() => {
    invalidateExtensionLinkStateCache();
    delete document.documentElement.dataset.revoraExtensionInstalled;
    vi.stubGlobal("crypto", {
      randomUUID: () => "fast-check-request-id",
    });
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: vi.fn() },
    });
    vi.mocked(adminFetchNoBounce).mockReset();
    vi.mocked(readAdminJson).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns linked when the newest server token has pairedAt", async () => {
    vi.useFakeTimers();

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      tokens: [
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
          pairedAt: "2026-01-01T00:00:01.000Z",
          expiresAt: null,
          extensionId: null,
        },
      ],
    });

    const statusPromise = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(1600);

    await expect(statusPromise).resolves.toEqual({
      linked: true,
      status: {
        installed: false,
        paired: true,
        verified: true,
        shop: null,
      },
    });

    vi.useRealTimers();
  });

  it("returns not linked when the server says paired but the extension reports disconnected", async () => {
    document.documentElement.dataset.revoraExtensionInstalled = "1";

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      tokens: [
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
          pairedAt: "2026-01-01T00:00:01.000Z",
          expiresAt: null,
          extensionId: null,
        },
      ],
    });

    const statusPromise = resolveExtensionLinkState();

    await vi.waitFor(() => {
      expect(window.parent.postMessage).toHaveBeenCalled();
    });

    // Extension is installed but disconnected (local storage cleared).
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "fast-check-request-id",
          installed: true,
          paired: false,
          verified: false,
          shop: "demo.myshopify.com",
        },
      })
    );

    await expect(statusPromise).resolves.toEqual({
      linked: false,
      status: {
        installed: true,
        paired: false,
        verified: false,
        shop: "demo.myshopify.com",
      },
    });
  });

  it("returns linked when the extension bridge reports paired", async () => {
    document.documentElement.dataset.revoraExtensionInstalled = "1";

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const statusPromise = resolveExtensionLinkState();

    await vi.waitFor(() => {
      expect(window.parent.postMessage).toHaveBeenCalled();
    });

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

  it("does not treat an unpaired token as linked", async () => {
    vi.useFakeTimers();

    document.documentElement.dataset.revoraExtensionInstalled = "1";
    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      tokens: [
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-01T00:00:02.000Z",
          pairedAt: null,
          expiresAt: null,
          extensionId: null,
        },
      ],
    });

    const statusPromise = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(1600);

    await expect(statusPromise).resolves.toEqual({
      linked: false,
      status: {
        installed: false,
        paired: false,
        verified: false,
        shop: null,
      },
    });

    vi.useRealTimers();
  });

  it("does not treat an empty token list as linked", async () => {
    vi.useFakeTimers();

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const statusPromise = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(1600);

    await expect(statusPromise).resolves.toEqual({
      linked: false,
      status: {
        installed: false,
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

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const first = resolveExtensionLinkState();
    const second = resolveExtensionLinkState();

    await vi.advanceTimersByTimeAsync(1600);

    await Promise.all([first, second]);

    expect(adminFetchNoBounce).toHaveBeenCalledTimes(1);
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
