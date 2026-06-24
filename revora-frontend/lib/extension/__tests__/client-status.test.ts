// @vitest-environment happy-dom

import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isExtensionLinked,
  queryExtensionClientStatus,
  waitForExtensionClientStatus,
} from "../client-status";

const ADMIN_ORIGIN = "https://admin.shopify.com";

describe("isExtensionLinked", () => {
  it("returns true when verified", () => {
    expect(
      isExtensionLinked({
        installed: true,
        paired: false,
        verified: true,
        shop: "demo.myshopify.com",
      })
    ).toBe(true);
  });

  it("returns true when installed and paired", () => {
    expect(
      isExtensionLinked({
        installed: true,
        paired: true,
        verified: false,
        shop: "demo.myshopify.com",
      })
    ).toBe(true);
  });

  it("returns false when extension is missing or unpaired", () => {
    expect(
      isExtensionLinked({
        installed: false,
        paired: false,
        verified: false,
        shop: null,
      })
    ).toBe(false);
  });
});

describe("queryExtensionClientStatus", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.revoraExtensionInstalled;
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-request-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts to admin and app origins even when the extension DOM marker is present", async () => {
    document.documentElement.dataset.revoraExtensionInstalled = "1";

    const parentPostMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: parentPostMessage },
    });

    const statusPromise = queryExtensionClientStatus();

    expect(parentPostMessage).toHaveBeenCalledWith(
      {
        type: "REVORA_REQUEST_EXTENSION_STATUS",
        requestId: "test-request-id",
      },
      ADMIN_ORIGIN
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "test-request-id",
          installed: true,
          paired: true,
          verified: true,
          shop: "demo.myshopify.com",
        } satisfies ExtensionStatusResponse,
      })
    );

    await expect(statusPromise).resolves.toEqual({
      installed: true,
      paired: true,
      verified: true,
      shop: "demo.myshopify.com",
    });
  });

  it("posts to admin and app origins when the DOM marker is absent", async () => {
    const parentPostMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: parentPostMessage },
    });

    const statusPromise = queryExtensionClientStatus();

    expect(parentPostMessage).toHaveBeenCalledWith(
      {
        type: "REVORA_REQUEST_EXTENSION_STATUS",
        requestId: "test-request-id",
      },
      ADMIN_ORIGIN
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "test-request-id",
          installed: true,
          paired: false,
          verified: false,
          shop: null,
        } satisfies ExtensionStatusResponse,
      })
    );

    await expect(statusPromise).resolves.toEqual({
      installed: true,
      paired: false,
      verified: false,
      shop: null,
    });
  });

  it("retries until paired when requirePaired is set", async () => {
    vi.useFakeTimers();

    let requestCount = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `request-${++requestCount}`,
    });

    document.documentElement.dataset.revoraExtensionInstalled = "1";

    const statusPromise = waitForExtensionClientStatus({
      attempts: 2,
      delayMs: 100,
      requirePaired: true,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "request-1",
          installed: true,
          paired: false,
          verified: false,
          shop: null,
        } satisfies ExtensionStatusResponse,
      })
    );

    await vi.advanceTimersByTimeAsync(100);

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "REVORA_EXTENSION_STATUS_RESPONSE",
          requestId: "request-2",
          installed: true,
          paired: true,
          verified: true,
          shop: "demo.myshopify.com",
        } satisfies ExtensionStatusResponse,
      })
    );

    await expect(statusPromise).resolves.toEqual({
      installed: true,
      paired: true,
      verified: true,
      shop: "demo.myshopify.com",
    });

    vi.useRealTimers();
  });
});
