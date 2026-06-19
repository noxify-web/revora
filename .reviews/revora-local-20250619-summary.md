# Revora Local Review Summary

**Mode:** Local (uncommitted changes)  
**Verdict:** REQUEST CHANGES  
**Review file:** `.reviews/revora-local-20250619.md`

## Counts

| Severity | Count |
|----------|-------|
| Critical   | 1 |
| Major      | 4 |
| Minor      | 4 |
| Nit        | 2 |

## Top priorities before merge

1. Rate-limit and harden connect-code exchange (brute-force risk).
2. Stop storing plaintext tokens in `ConnectCode`; align with hashed token model.
3. Allowlist paths in `ExtensionBridge` proxy.
4. Sync billing plan with Shopify subscription state (webhook + reconcile).

## Strengths

Admin-proxy for extension API, server-side tier enforcement, and the metaobject publish pipeline are well-designed and move the product toward a complete flow.