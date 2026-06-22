import {
  decodePairingCode,
  encodePairingCode,
} from "@revora/shared/pairing-code";
import { describe, expect, it } from "vitest";

describe("pairing-code", () => {
  it("round-trips encoded pairing codes", () => {
    const encoded = encodePairingCode({
      apiUrl: "https://example.trycloudflare.com",
      token: "rvr_test_token",
    });

    expect(decodePairingCode(encoded)).toEqual({
      apiBaseUrl: "https://example.trycloudflare.com",
      pairingToken: "rvr_test_token",
    });
  });

  it("accepts legacy bearer tokens", () => {
    expect(decodePairingCode("rvr_legacy_token")).toEqual({
      apiBaseUrl: "",
      pairingToken: "rvr_legacy_token",
    });
  });
});
