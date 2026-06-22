import extensionUi from "./extension-ui.css?inline";
import { getInterFontFace, getRevoraCssVariables } from "./theme";

export function getPanelStyles() {
  const fontUrl = chrome.runtime.getURL("fonts/InterVariable-latin.woff2");

  return `
    ${getInterFontFace(fontUrl)}

    :host {
      all: initial;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      display: block;
      font-family: var(--revora-font);
      ${getRevoraCssVariables()}
    }

    ${extensionUi}

    .panel {
      position: relative;
      width: 360px;
      max-height: 72vh;
      overflow: auto;
      color: var(--revora-text);
      background: var(--revora-surface);
      border: 1px solid var(--revora-border);
      border-radius: var(--revora-radius-lg);
      box-shadow: var(--revora-shadow-popover);
      padding: var(--revora-space-400);
      padding-top: calc(var(--revora-space-400) + 28px);
      font-size: var(--revora-font-size-base);
      line-height: 1.45;
    }

    .panel.collapsed {
      width: auto;
      max-height: none;
      overflow: visible;
      padding: 10px 14px;
      padding-top: 10px;
      cursor: pointer;
    }

    .panel-collapse {
      position: absolute;
      top: var(--revora-space-200);
      right: var(--revora-space-200);
    }

    .panel.collapsed .panel-collapse {
      position: static;
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

    .panel.is-running .status {
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

    .collapsed-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--revora-font-size-small);
      font-weight: 600;
      white-space: nowrap;
      color: var(--revora-text);
    }

    .collapsed-check {
      color: var(--revora-success);
      font-size: 14px;
      line-height: 1;
    }


  `;
}
