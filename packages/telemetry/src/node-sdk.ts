import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { loadTelemetryConfig } from './config';

let sdk: NodeSDK | null = null;
let started = false;

/**
 * Idempotent OpenTelemetry bootstrap for Node runtimes.
 * Never throws — telemetry must not block application startup.
 */
export async function startTelemetry(serviceNameOverride?: string): Promise<boolean> {
  if (started) return Boolean(sdk);
  started = true;

  try {
    const config = loadTelemetryConfig();
    if (!config.enabled) return false;

    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: serviceNameOverride || config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment': config.environment,
    });

    const url = config.endpoint.replace(/\/$/, '');
    sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: `${url}/v1/traces`,
        headers: config.headers,
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${url}/v1/metrics`,
          headers: config.headers,
        }),
      }),
    });

    await sdk.start();
    return true;
  } catch (error) {
    console.warn(
      `[telemetry] disabled: ${(error as Error).message}`.replace(/sk-[a-zA-Z0-9]+/g, '[redacted]'),
    );
    sdk = null;
    return false;
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;
  const active = sdk;
  sdk = null;
  await active.shutdown();
}
