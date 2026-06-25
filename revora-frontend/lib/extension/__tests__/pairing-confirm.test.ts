// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-fetch", () => ({
  adminFetchNoBounce: vi.fn(),
  adminFetchUntilSession: vi.fn(),
  readAdminJson: vi.fn(),
  runWithoutSessionBounce: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { broadcastConnectToken } from "@/components/extension-bridge";
import {
  adminFetchNoBounce,
  adminFetchUntilSession,
  readAdminJson,
} from "@/lib/admin-fetch";
import {
  confirmExtensionPairingAfterBroadcast,
  mintAndBroadcastConnectToken,
  newestTokenPaired,
  waitForPairingConfirmedMessage,
} from "../pairing-confirm";
import { persistPendingConnectToken } from "../pending-connect-token";

const SHOP = "demo.myshopify.com";

describe("newestTokenPaired", () => {
  it("returns true when the newest token has pairedAt", () => {
    expect(
      newestTokenPaired([
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
          pairedAt: "2026-01-01T00:00:01.000Z",
          expiresAt: null,
          extensionId: null,
        },
      ])
    ).toBe(true);
  });

  it("returns false when the newest token has not been paired", () => {
    expect(
      newestTokenPaired([
        {
          id: "token-1",
          label: "Chrome extension",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-01T00:00:02.000Z",
          pairedAt: null,
          expiresAt: null,
          extensionId: null,
        },
      ])
    ).toBe(false);
  });

  it("returns false when there are no tokens", () => {
    expect(newestTokenPaired([])).toBe(false);
  });
});

describe("waitForPairingConfirmedMessage", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "confirm-request-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves true when a matching REVORA_PAIRING_CONFIRMED arrives from same-origin", async () => {
    const confirmPromise = waitForPairingConfirmedMessage(SHOP, 5000);

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: SHOP },
      })
    );

    await expect(confirmPromise).resolves.toBe(true);
  });

  it("resolves true when a matching message arrives from the admin origin", async () => {
    const confirmPromise = waitForPairingConfirmedMessage(SHOP, 5000);

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://admin.shopify.com",
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: SHOP },
      })
    );

    await expect(confirmPromise).resolves.toBe(true);
  });

  it("ignores messages for a different shop", async () => {
    vi.useFakeTimers();

    const confirmPromise = waitForPairingConfirmedMessage(SHOP, 200);

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: "other.myshopify.com" },
      })
    );

    await vi.advanceTimersByTimeAsync(250);
    await expect(confirmPromise).resolves.toBe(false);

    vi.useRealTimers();
  });

  it("ignores messages from untrusted origins", async () => {
    vi.useFakeTimers();

    const confirmPromise = waitForPairingConfirmedMessage(SHOP, 200);

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example.com",
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: SHOP },
      })
    );

    await vi.advanceTimersByTimeAsync(250);
    await expect(confirmPromise).resolves.toBe(false);

    vi.useRealTimers();
  });

  it("resolves false on timeout", async () => {
    vi.useFakeTimers();

    const confirmPromise = waitForPairingConfirmedMessage(SHOP, 100);

    await vi.advanceTimersByTimeAsync(150);
    await expect(confirmPromise).resolves.toBe(false);

    vi.useRealTimers();
  });
});

describe("confirmExtensionPairingAfterBroadcast", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "confirm-request-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns linked when the extension posts REVORA_PAIRING_CONFIRMED", async () => {
    persistPendingConnectToken({
      apiUrl: "https://revora-app.example.com",
      shop: SHOP,
      token: "rvr_test",
    });

    const confirmPromise = confirmExtensionPairingAfterBroadcast(SHOP);

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: SHOP },
      })
    );

    await expect(confirmPromise).resolves.toEqual({
      linked: true,
      via: "confirmed",
    });
  });

  it("returns not linked on timeout", async () => {
    vi.useFakeTimers();

    const confirmPromise = confirmExtensionPairingAfterBroadcast(SHOP);

    await vi.advanceTimersByTimeAsync(16_000);

    await expect(confirmPromise).resolves.toEqual({
      linked: false,
      via: "none",
    });

    vi.useRealTimers();
  });

  it("falls back to the server pairedAt check when the event is lost", async () => {
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

    const confirmPromise = confirmExtensionPairingAfterBroadcast(SHOP);

    // Event never arrives — past the 3s event window.
    await vi.advanceTimersByTimeAsync(3500);

    await expect(confirmPromise).resolves.toEqual({
      linked: true,
      via: "server",
    });

    // Exactly one server call (the fallback), no polling loop.
    expect(adminFetchNoBounce).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe("mintAndBroadcastConnectToken", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "confirm-request-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("broadcasts the token and resolves when the extension confirms", async () => {
    vi.mocked(adminFetchUntilSession).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      token: "rvr_test",
      apiUrl: "https://revora-app.example.com",
      shop: SHOP,
    });

    const mintPromise = mintAndBroadcastConnectToken(broadcastConnectToken);

    // Let the broadcast + admin fetch resolve, then deliver the confirmation.
    await Promise.resolve();
    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "REVORA_PAIRING_CONFIRMED", shop: SHOP },
      })
    );

    await expect(mintPromise).resolves.toEqual({
      token: "rvr_test",
      apiUrl: "https://revora-app.example.com",
      shop: SHOP,
    });
  });

  it("throws when the extension does not confirm in time", async () => {
    vi.useFakeTimers();

    vi.mocked(adminFetchUntilSession).mockResolvedValue(new Response());
    vi.mocked(readAdminJson).mockResolvedValue({
      token: "rvr_test",
      apiUrl: "https://revora-app.example.com",
      shop: SHOP,
    });

    const mintPromise = mintAndBroadcastConnectToken(broadcastConnectToken);

    await vi.advanceTimersByTimeAsync(16_000);

    await expect(mintPromise).rejects.toThrow(
      "Could not confirm the extension connected"
    );

    vi.useRealTimers();
  });
});
