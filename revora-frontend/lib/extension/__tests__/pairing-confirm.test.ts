// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-fetch", () => ({
  adminFetchNoBounce: vi.fn(),
  adminFetchUntilSession: vi.fn(),
  readAdminJson: vi.fn(),
  runWithoutSessionBounce: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { adminFetchNoBounce, readAdminJson } from "@/lib/admin-fetch";

import {
  confirmExtensionPairingAfterBroadcast,
  newestTokenHasBeenUsed,
  waitForExtensionTokenUsage,
} from "../pairing-confirm";

describe("newestTokenHasBeenUsed", () => {
  it("returns true when the newest token has lastUsedAt", () => {
    expect(
      newestTokenHasBeenUsed([
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-01T00:00:01.000Z",
        },
      ])
    ).toBe(true);
  });

  it("returns false when the newest token has not been used", () => {
    expect(
      newestTokenHasBeenUsed([
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
        },
      ])
    ).toBe(false);
  });
});

describe("waitForExtensionTokenUsage", () => {
  beforeEach(() => {
    vi.mocked(adminFetchNoBounce).mockReset();
    vi.mocked(readAdminJson).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls until the newest token has lastUsedAt", async () => {
    vi.useFakeTimers();

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson)
      .mockResolvedValueOnce({
        tokens: [
          {
            id: "token-1",
            label: "Chrome extension",
            createdAt: "2026-01-01T00:00:00.000Z",
            lastUsedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        tokens: [
          {
            id: "token-1",
            label: "Chrome extension",
            createdAt: "2026-01-01T00:00:00.000Z",
            lastUsedAt: "2026-01-01T00:00:01.000Z",
          },
        ],
      });

    const usagePromise = waitForExtensionTokenUsage({
      attempts: 2,
      delayMs: 100,
      sessionToken: "session-token",
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(usagePromise).resolves.toBe(true);
    expect(adminFetchNoBounce).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe("confirmExtensionPairingAfterBroadcast", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.revoraExtensionInstalled;
    vi.stubGlobal("crypto", {
      randomUUID: () => "confirm-request-id",
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

  it("returns linked via bridge when postMessage reports paired", async () => {
    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({ tokens: [] });

    const confirmPromise =
      confirmExtensionPairingAfterBroadcast("session-token");

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "confirm-request-id",
          installed: true,
          paired: true,
          verified: true,
          shop: "demo.myshopify.com",
        },
      })
    );

    await expect(confirmPromise).resolves.toEqual({
      linked: true,
      via: "bridge",
      status: {
        installed: true,
        paired: true,
        verified: true,
        shop: "demo.myshopify.com",
      },
    });
  });

  it("returns linked via server when token lastUsedAt is set", async () => {
    vi.useFakeTimers();

    vi.mocked(adminFetchNoBounce).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      tokens: [
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-01T00:00:01.000Z",
        },
      ],
    });

    const confirmPromise =
      confirmExtensionPairingAfterBroadcast("session-token");

    await vi.advanceTimersByTimeAsync(900);

    await expect(confirmPromise).resolves.toEqual({
      linked: true,
      via: "server",
      status: {
        installed: true,
        paired: true,
        verified: true,
        shop: null,
      },
    });

    vi.useRealTimers();
  });
});
