export type TelemetryConfig = {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint: string;
  headers: Record<string, string>;
  sampleRatio: number;
};

export function loadTelemetryConfig(
  env: NodeJS.ProcessEnv = process.env,
): TelemetryConfig {
  const enabled = env.OTEL_ENABLED === 'true';
  const endpoint = (env.OTEL_EXPORTER_OTLP_ENDPOINT ?? '').trim();
  const headers = parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS ?? '');
  const sampleRatio = Number(env.OTEL_TRACES_SAMPLER_ARG ?? '0.2');

  return {
    enabled: enabled && Boolean(endpoint),
    serviceName: env.OTEL_SERVICE_NAME?.trim() || 'nexiora-api',
    serviceVersion: env.OTEL_SERVICE_VERSION?.trim() || '0.1.0',
    environment: env.OTEL_DEPLOYMENT_ENVIRONMENT?.trim() || env.NODE_ENV || 'development',
    endpoint,
    headers,
    sampleRatio: Number.isFinite(sampleRatio) ? Math.min(1, Math.max(0, sampleRatio)) : 0.2,
  };
}

function parseHeaders(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  return Object.fromEntries(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index < 0) return [part, ''];
        return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
      }),
  );
}
