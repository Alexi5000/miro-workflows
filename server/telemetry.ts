/**
 * server/telemetry.ts — v1.1 OpenTelemetry bootstrap.
 *
 * The SDK is optional: if `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, the
 * module exports a no-op tracer and the rest of the code is unchanged.
 *
 * v1.2: real OTel auto-instrumentation (http, pg, express) and a
 *   BatchSpanProcessor wired up here.
 */
import { trace, type Tracer } from "@opentelemetry/api";

let _tracer: Tracer | null = null;

export function startTelemetry(): Tracer {
  if (_tracer) return _tracer;
  // v1.1: do NOT install a global provider. The v1.2 work item will wire a
  // BatchSpanProcessor + OTLPTraceExporter here. For now, the tracer is
  // the API's no-op (returns non-recording spans).
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    // eslint-disable-next-line no-console
    console.warn("[telemetry] OTEL_EXPORTER_OTLP_ENDPOINT is set but v1.1 ships a no-op tracer. Use v1.2+ for real export.");
  }
  _tracer = trace.getTracer("miro-workflows", "1.1.0");
  return _tracer;
}

export function getTracer(): Tracer {
  return _tracer ?? trace.getTracer("miro-workflows", "1.1.0");
}

/** Convenience: run `fn` inside an active span (no-op if telemetry is off). */
export async function withSpan<T>(name: string, fn: (span: { setAttribute: (k: string, v: string | number | boolean) => void }) => Promise<T>): Promise<T> {
  const tracer = startTelemetry();
  return await tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn({
        setAttribute: (k, v) => span.setAttribute(k, v),
      });
    } finally {
      span.end();
    }
  });
}
