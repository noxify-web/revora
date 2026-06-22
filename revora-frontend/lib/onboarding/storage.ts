import { ONBOARDING_FLOW_STEPS, type OnboardingFlowStepId } from "./constants";
import {
  LEGACY_SETUP_GUIDE_DISMISSED,
  ONBOARDING_STORAGE_KEYS,
  REVORA_CLIENT_STORAGE_KEYS,
} from "./keys";

const FLOW_STEP_IDS = new Set<string>(
  ONBOARDING_FLOW_STEPS.map((step) => step.id)
);

function isBrowser() {
  return typeof window !== "undefined";
}

export function readOnboardingFlowStep(): OnboardingFlowStepId {
  if (!isBrowser()) {
    return "welcome";
  }

  const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowStep);
  if (stored && FLOW_STEP_IDS.has(stored)) {
    return stored as OnboardingFlowStepId;
  }

  return "welcome";
}

export function writeOnboardingFlowStep(step: OnboardingFlowStepId) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowStep, step);
}

export function readStorageSnapshot() {
  if (!isBrowser()) {
    return {
      flowComplete: false,
      extensionInstallAck: false,
      flowRestarted: false,
    };
  }

  return {
    flowComplete:
      window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowComplete) ===
      "true",
    extensionInstallAck:
      window.localStorage.getItem(
        ONBOARDING_STORAGE_KEYS.extensionInstallAck
      ) === "true",
    flowRestarted:
      window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.flowRestarted) ===
      "true",
  };
}

export function clearRevoraClientStorageKeys() {
  if (!isBrowser()) {
    return;
  }

  for (const key of REVORA_CLIENT_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function persistFlowComplete() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowComplete, "true");
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowStep);
}

export function persistSkipFlow() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowComplete, "true");
  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.dismissed, "true");
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowStep);
}

export function persistExtensionInstallAck() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    ONBOARDING_STORAGE_KEYS.extensionInstallAck,
    "true"
  );
}

export function persistFlowRestarted() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEYS.flowRestarted, "true");
}

export function clearFlowRestarted() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.flowRestarted);
}

export function shouldMigrateLegacyFlowComplete() {
  if (!isBrowser()) {
    return false;
  }

  const stored = readStorageSnapshot();
  if (stored.flowComplete || stored.flowRestarted) {
    return false;
  }

  return window.localStorage.getItem(LEGACY_SETUP_GUIDE_DISMISSED) === "true";
}
