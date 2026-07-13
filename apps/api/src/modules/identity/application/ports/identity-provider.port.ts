/**
 * Authenticated principal resolved from JWT / API key.
 * Domain-facing — no Clerk types leak past the adapter.
 */
export interface AuthPrincipal {
  readonly subjectId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly emailVerified: boolean;
}

export interface VerifyTokenInput {
  readonly bearerToken: string;
}

/**
 * Port: Identity provider verification.
 * Implemented by ClerkIdentityAdapter (and future Auth.js adapter).
 */
export interface IdentityProviderPort {
  verifyAccessToken(input: VerifyTokenInput): Promise<AuthPrincipal | null>;
}

export const IDENTITY_PROVIDER_PORT = Symbol('IDENTITY_PROVIDER_PORT');
