import { AuthScopes, type Session } from "@shopify/shopify-api";

import { getShopify } from "@/lib/shopify/shopify";

export function getConfiguredScopes(): AuthScopes {
  const shopify = getShopify();
  return new AuthScopes(shopify.config.scopes);
}

export function getMissingConfiguredScopes(session: Session | undefined) {
  if (!session?.scope) {
    return getConfiguredScopes().toArray();
  }

  const required = getConfiguredScopes();
  const granted = new AuthScopes(session.scope);

  return required.toArray().filter((scope) => !granted.has(scope));
}

export function sessionHasRequiredScopes(session: Session | undefined) {
  return getMissingConfiguredScopes(session).length === 0;
}
