# Entitlements Module

Resolves plan quotas and enforces rate limits / daily search caps.

## Public API

- `EntitlementsService.resolveContext(userId, ip)`
- `EntitlementsService.assertSearchAllowed(ctx)`
