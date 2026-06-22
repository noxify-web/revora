import { REVORA_FONT_IMPORT, REVORA_THEME } from "./theme"

export function getPanelStyles() {
  const t = REVORA_THEME

  return `
    ${REVORA_FONT_IMPORT}

    :host {
      all: initial;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      display: block;
      font-family: ${t.fontFamily};
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .panel {
      width: 320px;
      max-height: 70vh;
      overflow: auto;
      color: ${t.text};
      background: ${t.surface};
      border: 1px solid ${t.border};
      border-radius: ${t.radiusLarge};
      box-shadow: ${t.shadowBrand};
      padding: 16px;
      font-size: ${t.fontSizeBase};
      line-height: 1.45;
    }

    .panel.collapsed {
      width: auto;
      max-height: none;
      overflow: visible;
      padding: 10px 14px;
      cursor: pointer;
      background: ${t.surface};
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 14px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: ${t.radiusSmall};
      background: ${t.orange};
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .title {
      font-size: ${t.fontSizeHeading};
      font-weight: 600;
      line-height: 1.2;
      margin: 0;
      color: ${t.text};
      letter-spacing: -0.01em;
    }

    .icon-btn {
      width: 28px;
      height: 28px;
      border: 1px solid ${t.border};
      border-radius: ${t.radiusSmall};
      background: ${t.surface};
      color: ${t.textSubdued};
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .icon-btn:hover:not(:disabled) {
      background: ${t.surfaceSubdued};
      color: ${t.text};
    }

    .context {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: ${t.radiusSmall};
      background: ${t.surfaceSubdued};
      color: ${t.textSubdued};
      font-size: ${t.fontSizeSmall};
      line-height: 1.4;
      word-break: break-word;
    }

    .field {
      margin-bottom: 10px;
    }

    .field:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      font-size: ${t.fontSizeSmall};
      font-weight: 500;
      margin-bottom: 4px;
      color: ${t.text};
    }

    select,
    button.action {
      width: 100%;
      font-family: inherit;
      font-size: ${t.fontSizeBase};
      line-height: 1.3;
    }

    select {
      height: 36px;
      padding: 0 10px;
      margin-bottom: 0;
      border-radius: ${t.radiusSmall};
      border: 1px solid ${t.border};
      background: ${t.surface};
      color: ${t.text};
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23616161' d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 28px;
    }

    select:focus {
      outline: 2px solid ${t.orangeLight};
      border-color: ${t.orange};
    }

    button.action {
      border: 0;
      border-radius: ${t.radiusSmall};
      padding: 10px 12px;
      background: ${t.orange};
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.15s ease;
    }

    button.action:hover:not(:disabled) {
      background: ${t.orangeDark};
    }

    button.action.secondary {
      background: ${t.surface};
      color: ${t.text};
      border: 1px solid ${t.border};
      font-weight: 500;
    }

    button.action.secondary:hover:not(:disabled) {
      background: ${t.surfaceSubdued};
    }

    button.action:disabled,
    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .setup.is-complete {
      display: none;
    }

    .progress {
      height: 4px;
      background: ${t.surfaceSubdued};
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress > span {
      display: block;
      height: 100%;
      width: 0%;
      background: ${t.orange};
      transition: width 0.2s ease;
    }

    .panel.is-complete .progress > span {
      background: ${t.success};
    }

    .status {
      font-size: ${t.fontSizeSmall};
      color: ${t.textSubdued};
      min-height: 16px;
      margin: 0 0 10px;
      word-break: break-word;
    }

    .panel.is-running .status {
      color: ${t.text};
      font-weight: 500;
    }

    .row {
      display: flex;
      gap: 8px;
    }

    .row button.action {
      flex: 1;
      margin-bottom: 0;
    }

    .success-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 8px 4px 4px;
    }

    .success-icon {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: ${t.successSubdued};
      color: ${t.success};
      display: grid;
      place-items: center;
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
    }

    .success-count {
      margin: 0;
      font-size: ${t.fontSizeHeading};
      font-weight: 600;
      color: ${t.text};
    }

    .success-detail {
      margin: -4px 0 0;
      font-size: ${t.fontSizeSmall};
      color: ${t.textSubdued};
      line-height: 1.4;
    }

    .success-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .collapsed-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: ${t.fontSizeSmall};
      font-weight: 600;
      white-space: nowrap;
      color: ${t.text};
    }

    .collapsed-check {
      color: ${t.success};
      font-size: 14px;
      line-height: 1;
    }

    .connection-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: ${t.fontSizeSmall};
      color: ${t.textSubdued};
    }

    .connection-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${t.success};
      flex-shrink: 0;
    }
  `
}