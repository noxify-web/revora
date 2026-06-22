"use client";

import { EXTENSION_IMPORT_STEPS } from "@/lib/onboarding/constants";

export const EXTENSION_CONNECTED_MODAL_ID = "revora-extension-connected-modal";

type OverlayModalElement = HTMLElement & { showOverlay?: () => void };

export function openExtensionConnectedModal() {
  requestAnimationFrame(() => {
    const modal = document.getElementById(
      EXTENSION_CONNECTED_MODAL_ID
    ) as OverlayModalElement | null;
    modal?.showOverlay?.();
  });
}

export function ExtensionConnectedModal() {
  return (
    <s-modal
      heading="Extension connected"
      id={EXTENSION_CONNECTED_MODAL_ID}
      size="small"
    >
      <s-stack gap="base">
        <s-paragraph>
          Your Revora Chrome extension is linked to this store. Here&apos;s how
          to import reviews:
        </s-paragraph>
        <s-ordered-list>
          {EXTENSION_IMPORT_STEPS.map((step) => (
            <s-list-item key={step}>{step}</s-list-item>
          ))}
        </s-ordered-list>
      </s-stack>
      <s-button
        command="--hide"
        commandFor={EXTENSION_CONNECTED_MODAL_ID}
        slot="primary-action"
        variant="primary"
      >
        Got it
      </s-button>
    </s-modal>
  );
}
