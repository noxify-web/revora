export const ONBOARDING_STORAGE_KEYS = {
  dismissed: "revora-onboarding-dismissed",
  extensionInstallAck: "revora-onboarding-extension-install-ack",
  flowComplete: "revora-onboarding-flow-complete",
  flowStep: "revora-onboarding-flow-step",
  flowRestarted: "revora-onboarding-flow-restarted",
} as const

export const LEGACY_SETUP_GUIDE_DISMISSED = "revora-setup-guide-dismissed"

/** Legacy + dashboard keys cleared by dev reset. */
export const REVORA_CLIENT_STORAGE_KEYS = [
  ONBOARDING_STORAGE_KEYS.dismissed,
  ONBOARDING_STORAGE_KEYS.extensionInstallAck,
  ONBOARDING_STORAGE_KEYS.flowComplete,
  ONBOARDING_STORAGE_KEYS.flowStep,
  ONBOARDING_STORAGE_KEYS.flowRestarted,
  LEGACY_SETUP_GUIDE_DISMISSED,
  "revora-auto-import",
] as const