# Identity Module

Bounded context for authentication and local user projections.

## Boundaries

- **Owns:** AuthPrincipal resolution, User upsert from IdP, AuthGuard
- **Does not own:** Billing entitlements, search sessions

## Ports

| Port                   | Adapter                      |
| ---------------------- | ---------------------------- |
| `IdentityProviderPort` | `ClerkIdentityAdapter`       |
| `UserDirectoryPort`    | `PrismaUserDirectoryAdapter` |

Swap Clerk for Auth.js by implementing `IdentityProviderPort` only.
