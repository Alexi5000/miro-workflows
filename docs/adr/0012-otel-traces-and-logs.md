# ADR-0012: OpenTelemetry traces + structured logs (v1.1)

- Status: Accepted
- Date: 2026-07-07

## Context

The v1.0 foundation emits structured one-line JSON access logs and
Prometheus metrics. v1.0 cannot tell us:
- Why a specific request was slow (we know `durMs` but not the
  per-step breakdown).
- How a workflow run's events correlate with downstream Miro calls.
- Where time goes during OAuth handshakes.

## Decision

Add **OpenTelemetry** traces alongside the existing logs and metrics.

- New dep: `@opentelemetry/api` + `@opentelemetry/sdk-node` +
  `@opentelemetry/exporter-trace-otlp-http`. **No codegen** (use the
  no-codegen SDK to keep the bundle small).
- A `telemetry.ts` module exposes:
  - `startTelemetry()` — initialises a Node tracer provider with an OTLP
    HTTP exporter; no-op fallback when `OTEL_EXPORTER_OTLP_ENDPOINT` is
    unset (so the foundation still runs without an OTel collector).
  - `tracer` — used in the bootstrap to wrap every request in a span.
- Each HTTP span carries:
  - `http.method`, `http.route`, `http.status_code`, `http.duration_ms`.
  - `auth.workspace_id`, `auth.token_id`, `auth.scopes`.
  - `db.statement` (sanitised: contract names, no PII).
- The Prometheus exporter stays as-is. OTel and metrics are independent
  pipelines by design.
- Trace ID is exposed to clients as `X-Trace-Id` so the existing
  `requestId` log line is now `requestId=<…>, traceId=<…>`.

## Consequences

- ✅ CI runs without a collector (no-op fallback).
- ✅ Production can ship to **Tempo**, **Honeycomb**, **Grafana Cloud**,
  or any OTLP-compatible backend by setting `OTEL_EXPORTER_OTLP_ENDPOINT`.
- ✅ Span data is correlated with the access log via `traceId`.
- ⚠️ Adds ~2 transitive deps. Pin to `^1.x` for the SDK and
  `@opentelemetry/api@^1.x`.
- ⚠️ Spans can leak request bodies if not sanitised. v1.1 ships a
  `sanitise(statement)` helper that strips PII before attaching to the
  span.

## Alternatives considered

- **OpenTelemetry Logs SDK (v1.0+)**: considered. Rejected — we already
  have a one-line JSON access log that integrates with the log
  aggregator. OTel Logs adds another exporter without a clear win.
- **Datadog APM, New Relic, AppDynamics**: rejected for the same reason
  as v1.0 ADR-0008. OTLP is the lowest common denominator.
