type IconTone =
  | "base"
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "subdued";

function iconClass(tone: IconTone = "base") {
  return `revora-icon revora-icon--${tone}`;
}

export function appExtensionIcon(tone: IconTone = "base") {
  return `<svg class="${iconClass(tone)}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M6.28 3.22a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1-1.06 1.06l-.97-.97v8.69a.75.75 0 0 1-1.5 0v-8.69l-.97.97a.75.75 0 0 1-1.06-1.06l2.5-2.5Zm5.94 0a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1-1.06 1.06l-.97-.97v8.69a.75.75 0 0 1-1.5 0v-8.69l-.97.97a.75.75 0 0 1-1.06-1.06l2.5-2.5Z"/></svg>`;
}

export function checkCircleIcon(tone: IconTone = "success") {
  return `<svg class="${iconClass(tone)}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.53-9.47a.75.75 0 0 0-1.06-1.06L9 10.94 7.53 9.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4Z"/></svg>`;
}

export function alertCircleIcon(tone: IconTone = "warning") {
  return `<svg class="${iconClass(tone)}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.25 6.75a.75.75 0 0 1 1.5 0v5.5a.75.75 0 0 1-1.5 0v-5.5Zm.75 9.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>`;
}

export function spinnerIcon() {
  return `<svg class="revora-icon revora-icon--subdued revora-spinner" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" opacity="0.25"/><path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

export function connectIcon() {
  return `<svg class="revora-icon revora-icon--on-fill" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7.25 4.5a2.75 2.75 0 1 0 0 5.5h5.5a2.75 2.75 0 1 0 0-5.5H7.25Z"/></svg>`;
}

export function disconnectIcon(tone: IconTone = "critical") {
  return `<svg class="${iconClass(tone)}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"/></svg>`;
}

export function statusIconForTone(tone: "" | "ok" | "error" | "pending") {
  if (tone === "ok") {
    return checkCircleIcon("success");
  }
  if (tone === "error") {
    return alertCircleIcon("critical");
  }
  if (tone === "pending") {
    return spinnerIcon();
  }
  return alertCircleIcon("warning");
}
