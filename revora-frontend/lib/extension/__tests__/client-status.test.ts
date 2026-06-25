// @vitest-environment happy-dom

import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isExtensionLinked,
  queryExtensionClientStatus,
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

  it("posts to the admin parent with the pinned admin origin", async () => {
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

  it("resolves status from the admin parent origin", async () => {
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
});
