/**
 * Next.js server instrumentation — starts OpenTelemetry when enabled.
 * Never throws; telemetry must not block web startup.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { startTelemetry } = await import('@nexiora/telemetry');
    await startTelemetry(process.env.OTEL_SERVICE_NAME?.trim() || 'nexiora-web');
  } catch (error) {
    console.warn(
      `[telemetry] web bootstrap skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
