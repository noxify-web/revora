import extensionUi from "./extension-ui.css?inline";
import { getInterFontFace, getRevoraCssVariables } from "./theme";

export function getPanelStyles() {
  const fontUrl = chrome.runtime.getURL("fonts/InterVariable-latin.woff2");

  return `
    ${getInterFontFace(fontUrl)}

    :host {
      all: initial;
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 2147483646;
      display: block;
      font-family: var(--revora-font);
      ${getRevoraCssVariables()}
    }

    ${extensionUi}

    [hidden] {
      display: none !important;
    }

    .revora-widget {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--revora-space-300);
    }

    .revora-fab {
      position: relative;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 56px;
      height: 56px;
      padding: 0;
      cursor: pointer;
      background: var(--revora-brand);
      border: none;
      border-radius: 50%;
      box-shadow:
        0 2px 8px rgba(251, 119, 1, 0.35),
        0 4px 20px rgba(0, 0, 0, 0.15);
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }

    .revora-fab:hover {
      transform: scale(1.05);
      box-shadow:
        0 4px 12px rgba(251, 119, 1, 0.45),
        0 6px 24px rgba(0, 0, 0, 0.18);
    }

    .revora-fab:active {
      transform: scale(0.97);
    }

    .revora-fab:focus-visible {
      outline: 2px solid var(--revora-info);
      outline-offset: 3px;
    }

    .revora-fab-mark {
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .revora-fab .revora-icon {
      width: 24px;
      height: 24px;
    }

    .revora-fab.is-running .revora-fab-mark {
      display: none;
    }

    .revora-fab.is-running .revora-fab-spinner {
      display: block;
    }

    .revora-fab.is-complete .revora-fab-mark {
      display: none;
    }

    .revora-fab.is-complete .revora-fab-check {
      display: block;
    }

    .revora-fab-spinner,
    .revora-fab-check {
      display: none;
    }

    .revora-fab .revora-fab-spinner .revora-icon,
    .revora-fab .revora-fab-check .revora-icon {
      color: #fff;
    }

    .revora-btn--primary .revora-icon {
      color: var(--revora-text-on-fill);
    }

    .revora-fab-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      font-size: 10px;
      font-weight: 700;
      line-height: 18px;
      color: #fff;
      text-align: center;
      background: var(--revora-fill-brand);
      border: 2px solid #fff;
      border-radius: 999px;
    }

    .revora-fab-hint {
      position: absolute;
      left: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      padding: 8px 12px;
      font-size: var(--revora-font-size-small);
      font-weight: 600;
      line-height: 1.2;
      color: var(--revora-text);
      white-space: nowrap;
      pointer-events: none;
      background: var(--revora-surface);
      border: 1px solid var(--revora-border);
      border-radius: var(--revora-radius-sm);
      box-shadow: var(--revora-shadow-popover);
    }

    .revora-fab-hint::after {
      content: "";
      position: absolute;
      top: 50%;
      left: -5px;
      width: 8px;
      height: 8px;
      background: var(--revora-surface);
      border-bottom: 1px solid var(--revora-border);
      border-left: 1px solid var(--revora-border);
      transform: translateY(-50%) rotate(45deg);
    }

    .revora-panel {
      display: none;
      flex-direction: column;
      width: 360px;
      max-height: min(72vh, 520px);
      overflow: hidden;
      color: var(--revora-text);
      background: var(--revora-surface);
      border: 1px solid var(--revora-border);
      border-radius: var(--revora-radius-lg);
      box-shadow: var(--revora-shadow-popover);
      animation: revora-panel-in 0.2s ease;
    }

    .revora-widget.is-open .revora-panel {
      display: flex;
    }

    @keyframes revora-panel-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .revora-panel-header {
      display: flex;
      flex-shrink: 0;
      gap: var(--revora-space-200);
      align-items: center;
      justify-content: space-between;
      padding: 14px var(--revora-space-400);
      color: #fff;
      background: var(--revora-brand);
    }

    .revora-panel-brand {
      display: flex;
      gap: var(--revora-space-200);
      align-items: center;
      min-width: 0;
    }

    .revora-panel-brand-mark {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 32px;
      height: 32px;
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
      background: rgba(255, 255, 255, 0.18);
      border-radius: var(--revora-radius-sm);
    }

    .revora-panel-brand-copy {
      min-width: 0;
    }

    .revora-panel-title {
      margin: 0;
      font-size: var(--revora-font-size-heading);
      font-weight: 600;
      line-height: 1.25;
      color: #fff;
      letter-spacing: -0.01em;
    }

    .revora-panel-subtitle {
      margin: 2px 0 0;
      font-size: var(--revora-font-size-small);
      line-height: 1.3;
      color: rgba(255, 255, 255, 0.88);
    }

    .revora-panel-close {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 32px;
      height: 32px;
      padding: 0;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.14);
      border: none;
      border-radius: var(--revora-radius-sm);
      transition: background 0.15s ease;
    }

    .revora-panel-close:hover {
      background: rgba(255, 255, 255, 0.24);
    }

    .revora-panel-close .revora-icon {
      width: 18px;
      height: 18px;
    }

    .revora-panel-body {
      flex: 1;
      padding: var(--revora-space-400);
      overflow: auto;
      font-size: var(--revora-font-size-base);
      line-height: 1.45;
    }

    .section {
      margin-bottom: var(--revora-space-400);
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .setup.is-complete {
      display: none;
    }

    .status {
      font-size: var(--revora-font-size-small);
      color: var(--revora-text-subdued);
      min-height: 16px;
      margin: 0 0 var(--revora-space-300);
      word-break: break-word;
    }

    .revora-panel.is-running .status {
      color: var(--revora-text);
      font-weight: 500;
    }

    .success-state {
      display: flex;
      flex-direction: column;
      gap: var(--revora-space-300);
      text-align: left;
    }

    .success-state .revora-banner__heading {
      font-size: var(--revora-font-size-heading);
    }
  `;
}
