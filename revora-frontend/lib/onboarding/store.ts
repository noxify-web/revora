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

const serverSnapshot: OnboardingSnapshot = {
  hydrated: false,
  flowComplete: false,
  extensionInstallAck: false,
};

let snapshot: OnboardingSnapshot = serverSnapshot;
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

/** Hydrate store from localStorage, migrate legacy keys, and handle dev ?reset=1. */
export function hydrateOnboardingStore() {
  if (typeof window === "undefined") {
    return snapshot;
  }

  if (
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).get("reset") === "1"
  ) {
    resetOnboardingWizardState();
    stripDevResetParam();
  } else if (shouldMigrateLegacyFlowComplete()) {
    completeOnboardingFlow();
  } else {
    applyStorageToSnapshot();
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
