# ADR-0008: Structured access logging + Prometheus `/metrics`

- Status: Accepted
- Date: 2026-07-06

## Context

The foundation was a black box: the server's access pattern, request
latency distribution, and workflow-run outcomes were all unobservable.
The original `console.log` in `server/index.ts` printed one line per
request but had no consistent shape, no correlation across services, and
no scrapeable metrics.

## Decision

- Every HTTP request goes through a closure-scoped `sendLogged()` wrapper
  that:
  - Writes the response via the original `send()`.
  - Records the request in `server/metrics.ts` (`incHttpRequest`,
    `observeHttpDuration`).
  - Emits a one-line JSON access log to stdout with `requestId`,
    `method`, `path`, `status`, `durMs`, `workspace`.
- A `requestId` header (`X-Request-Id`) is honored if provided, otherwise
  generated as `req-<8 hex>`.
- A Prometheus text-format endpoint at `/metrics` exports:
  - `miro_workflows_build_info{...}=1`
  - `miro_workflows_uptime_seconds`
  - `miro_workflows_http_requests_total{method,path,status}`
  - `miro_workflows_http_request_duration_ms_sum{...}` + `_count{...}`
  - `miro_workflows_workflow_runs_total{outcome}`
  - `miro_workflows_webhook_deliveries_total{kind}`
- No log/OTEL dep is added to the foundation; the JSON line is
  log-aggregator friendly (Loki, Vector, Fluent Bit all parse it
  without config).

## Consequences

- ✅ Structured access log is asserted in `tests/api.test.ts` indirectly
  (test setup uses jsdom fetch + verifies response shape).
- ✅ `pnpm run bench` produces measurable numbers; the docs/BENCHMARK.md
  table is reproducible.
- ✅ `/metrics` endpoint exercises in the e2e test.
- ⚠️ For higher-cardinality paths (e.g. `/api/boards/:id/items`), label
  explosion could grow the metric series. v1.1 adds label-bound
  capping.

## Alternatives considered

- **`pino` + `prom-client`**: rejected for foundation — adds 2 deps, neither
  strictly needed for the demo. v1.1 swaps in pino + OTel when we wire
  production logs.
- **JSON logger with `pino-pretty`**: rejected — pretty output is for dev
  only and the in-process log line should be one-line JSON in all envs.
