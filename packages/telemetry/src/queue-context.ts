import { context, propagation, trace } from '@opentelemetry/api';

export type QueueTelemetryContext = {
  traceparent?: string;
  tracestate?: string;
};

/**
 * Inject W3C trace context into BullMQ job metadata / payloads.
 */
export function injectQueueContext<T extends Record<string, unknown>>(
  target: T,
): T & QueueTelemetryContext {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return {
    ...target,
    ...(carrier.traceparent ? { traceparent: carrier.traceparent } : {}),
    ...(carrier.tracestate ? { tracestate: carrier.tracestate } : {}),
  };
}

/**
 * Extract W3C context from a BullMQ job and run work inside that context.
 */
export async function withQueueContext<T>(
  meta: QueueTelemetryContext | undefined,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const carrier: Record<string, string> = {};
  if (meta?.traceparent) carrier.traceparent = meta.traceparent;
  if (meta?.tracestate) carrier.tracestate = meta.tracestate;
  const extracted = propagation.extract(context.active(), carrier);
  const tracer = trace.getTracer('nexiora-queue');
  return context.with(extracted, () =>
    tracer.startActiveSpan(name, async (span) => {
      try {
        return await fn();
      } finally {
        span.end();
      }
    }),
  );
}
