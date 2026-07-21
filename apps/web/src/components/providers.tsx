'use client';

import * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { PwaManager } from './pwa-manager';

export function Providers({ children }: { children: React.ReactNode }) {
  const themedApp = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <PwaManager />
    </ThemeProvider>
  );

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return themedApp;

  return <ClerkProvider publishableKey={publishableKey}>{themedApp}</ClerkProvider>;
}
