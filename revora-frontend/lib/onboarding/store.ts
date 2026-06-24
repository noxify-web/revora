"use client";

import { useSyncExternalStore } from "react";

import {
  clearFlowRestarted,
  clearRevoraClientStorageKeys,
  persistExtensionInstallAck,
  persistFlowComplete,
  persistFlowRestarted,
  persistSkipFlow,
  readStorageSnapshot,
  shouldMigrateLegacyFlowComplete,
} from "./storage";

export interface OnboardingSnapshot {
  extensionInstallAck: boolean;
  flowComplete: boolean;
  hydrated: boolean;
}

// SSR defaults to the post-onboarding dashboard so merchants are not blocked on a
// client-only "Loading..." gate while embedded admin JS hydrates.
const serverSnapshot: OnboardingSnapshot = {
  hydrated: true,
  flowComplete: true,
  extensionInstallAck: false,
};

let snapshot: OnboardingSnapshot = serverSnapshot;
let storageHydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function applyStorageToSnapshot() {
  const stored = readStorageSnapshot();
  snapshot = {
    hydrated: snapshot.hydrated,
    flowComplete: stored.flowComplete,
    extensionInstallAck: stored.extensionInstallAck,
  };
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOnboardingSnapshot() {
  return snapshot;
}

function stripDevResetParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") !== "1") {
    return;
  }

  params.delete("reset");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function hydrateOnboardingStoreFromStorage() {
  if (
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).get("reset") === "1"
  ) {
    resetOnboardingWizardState();
    stripDevResetParam();
    return;
  }

  if (shouldMigrateLegacyFlowComplete()) {
    completeOnboardingFlow();
    return;
  }

  applyStorageToSnapshot();
}

/** Hydrate store from localStorage, migrate legacy keys, and handle dev ?reset=1. */
export function hydrateOnboardingStore() {
  if (typeof window === "undefined") {
    return snapshot;
  }

  if (storageHydrated) {
    return snapshot;
  }

  storageHydrated = true;

  try {
    hydrateOnboardingStoreFromStorage();
  } catch {
    snapshot = { ...serverSnapshot, hydrated: true };
  }

  snapshot = { ...snapshot, hydrated: true };
  notify();
  return snapshot;
}

export function consumeFlowRestarted() {
  if (typeof window === "undefined") {
    return false;
  }

  const restarted = readStorageSnapshot().flowRestarted;
  if (restarted) {
    clearFlowRestarted();
  }

  return restarted;
}

export function completeOnboardingFlow() {
  persistFlowComplete();
  applyStorageToSnapshot();
  notify();
}

export function skipOnboardingFlow() {
  persistSkipFlow();
  applyStorageToSnapshot();
  notify();
}

export function acknowledgeExtensionInstall() {
  persistExtensionInstallAck();
  applyStorageToSnapshot();
  notify();
}

export function resetOnboardingWizardState() {
  clearRevoraClientStorageKeys();
  persistFlowRestarted();
  storageHydrated = true;
  snapshot = {
    hydrated: true,
    flowComplete: false,
    extensionInstallAck: false,
  };
  notify();
}

export const resetOnboardingForDev = resetOnboardingWizardState;

export function useOnboardingStore(): OnboardingSnapshot {
  return useSyncExternalStore(
    subscribe,
    getOnboardingSnapshot,
    () => serverSnapshot
  );
}
