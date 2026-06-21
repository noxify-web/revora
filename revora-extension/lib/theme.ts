/** Design tokens aligned with Revora admin (Polaris) while keeping brand orange. */
export const REVORA_THEME = {
  orange: "#FB7701",
  orangeDark: "#E56B00",
  orangeLight: "#FFF4EB",
  orangeMuted: "#FFD8B8",

  text: "#303030",
  textSubdued: "#616161",
  textDisabled: "#8A8A8A",
  border: "#E3E3E3",
  borderStrong: "#C9C9C9",
  surface: "#FFFFFF",
  surfaceSubdued: "#F7F7F7",
  surfaceHover: "#F1F1F1",

  success: "#29845A",
  successSubdued: "#E3F1DF",
  successText: "#0B5E35",
  critical: "#E51C00",
  criticalSubdued: "#FFF1F0",
  warning: "#B98900",

  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizeBase: "13px",
  fontSizeSmall: "12px",
  fontSizeHeading: "14px",

  radiusSmall: "8px",
  radiusBase: "12px",
  radiusLarge: "16px",

  shadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
  shadowBrand: "0 8px 24px rgba(251, 119, 1, 0.14)",
} as const

export const REVORA_FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");'

export const REVORA_CSS_VARIABLES = `
  --revora-orange: ${REVORA_THEME.orange};
  --revora-orange-dark: ${REVORA_THEME.orangeDark};
  --revora-orange-light: ${REVORA_THEME.orangeLight};
  --revora-border: ${REVORA_THEME.border};
  --revora-border-strong: ${REVORA_THEME.borderStrong};
  --revora-text: ${REVORA_THEME.text};
  --revora-text-subdued: ${REVORA_THEME.textSubdued};
  --revora-surface: ${REVORA_THEME.surface};
  --revora-surface-subdued: ${REVORA_THEME.surfaceSubdued};
  --revora-success: ${REVORA_THEME.success};
  --revora-success-subdued: ${REVORA_THEME.successSubdued};
  --revora-success-text: ${REVORA_THEME.successText};
  --revora-critical: ${REVORA_THEME.critical};
  --revora-critical-subdued: ${REVORA_THEME.criticalSubdued};
  --revora-font: ${REVORA_THEME.fontFamily};
  --revora-radius-sm: ${REVORA_THEME.radiusSmall};
  --revora-radius: ${REVORA_THEME.radiusBase};
  --revora-radius-lg: ${REVORA_THEME.radiusLarge};
  --revora-shadow: ${REVORA_THEME.shadow};
`