export function clerkErrorMessage(cause: unknown): string {
  const error = cause as {
    errors?: Array<{ longMessage?: string; message?: string }>;
    message?: string;
  };
  return (
    error.errors?.[0]?.longMessage ??
    error.errors?.[0]?.message ??
    error.message ??
    'Authentication could not be completed.'
  );
}

export function isAlreadySignedInError(cause: unknown): boolean {
  const error = cause as {
    errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
    message?: string;
  };
  const code = (error.errors?.[0]?.code ?? '').toLowerCase();
  const message = (
    error.errors?.[0]?.longMessage ??
    error.errors?.[0]?.message ??
    error.message ??
    ''
  ).toLowerCase();
  return (
    code === 'session_exists' ||
    message.includes('already signed in') ||
    message.includes('already logged') ||
    message.includes("you're already") ||
    message.includes('you are already')
  );
}
