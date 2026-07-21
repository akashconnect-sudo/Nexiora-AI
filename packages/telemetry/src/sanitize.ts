const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|api[_-]?key|email|otp|jwt|prompt|query|body|payment|card)/i;

/**
 * Redact attribute keys/values that may contain PII or secrets.
 */
export function sanitizeAttributes(
  input: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === 'string') {
      output[key] = sanitizeUrl(value).slice(0, 200);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    }
  }
  return output;
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.replace(/([?&][^=]+=)[^&]*/g, '$1[redacted]');
  }
}
