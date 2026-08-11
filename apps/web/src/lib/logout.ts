'use client';

import { clearSession } from './session';

type ClerkWindow = {
  Clerk?: {
    signOut?: (options?: { redirectUrl?: string }) => Promise<void>;
  };
};

/**
 * Clears the Nexiora session and Clerk session (when present), then leaves the app.
 * Logout previously only cleared localStorage, which left Clerk signed in and caused
 * "You're already signed in" on the next login attempt.
 */
export async function performLogout(redirectTo = '/sign-in'): Promise<void> {
  clearSession();

  try {
    const clerk = (window as unknown as ClerkWindow).Clerk;
    if (clerk?.signOut) {
      await clerk.signOut({ redirectUrl: redirectTo });
      return;
    }
  } catch {
    // Fall through to a hard navigation if Clerk sign-out fails.
  }

  window.location.assign(redirectTo);
}
