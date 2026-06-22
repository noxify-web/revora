import type { Session } from "@shopify/shopify-api"

export const THEMES_READ_SCOPE = "read_themes"

export function parseSessionScopes(scope: string | undefined) {
  return (scope ?? "")
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function sessionHasScope(session: Session, scope: string) {
  return parseSessionScopes(session.scope).includes(scope)
}

export function sessionHasThemesAccess(session: Session) {
  return sessionHasScope(session, THEMES_READ_SCOPE)
}

export function isThemesAccessDeniedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes(THEMES_READ_SCOPE) ||
    message.includes("Access denied for themes")
  )
}