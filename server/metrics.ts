/**
 * server/metrics.ts — minimal in-process metrics (Prometheus text format).
 *
 * We don't pull in `prom-client` to keep the dep tree small. Counters and
 * a tiny histogram are enough for the foundation; `v1.2` will add OTLP.
 */

interface State {
  httpRequests: Map<string, number>;
  httpDurationSumMs: Map<string, number>;
  httpDurationCount: Map<string, number>;
  runOutcomes: Map<string, number>;
  webhookDeliveries: { received: number; duplicates: number; failed: number };
  bootEpochMs: number;
}

const state: State = {
  httpRequests: new Map(),
  httpDurationSumMs: new Map(),
  httpDurationCount: new Map(),
  runOutcomes: new Map(),
  webhookDeliveries: { received: 0, duplicates: 0, failed: 0 },
  bootEpochMs: Date.now(),
};

function labelKey(labels: Record<string, string>): string {
  return Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",");
}

export function incHttpRequest(method: string, path: string, status: number) {
  const key = labelKey({ method, path, status: String(status) });
  state.httpRequests.set(key, (state.httpRequests.get(key) ?? 0) + 1);
  state.httpDurationCount.set(key, (state.httpDurationCount.get(key) ?? 0) + 1);
}

export function observeHttpDuration(method: string, path: string, status: number, ms: number) {
  const key = labelKey({ method, path, status: String(status) });
  state.httpDurationSumMs.set(key, (state.httpDurationSumMs.get(key) ?? 0) + ms);
}

export function incRunOutcome(outcome: "completed" | "failed") {
  state.runOutcomes.set(outcome, (state.runOutcomes.get(outcome) ?? 0) + 1);
}

export function incWebhookDelivery(kind: "received" | "duplicate" | "failed") {
  if (kind === "duplicate") state.webhookDeliveries.duplicates += 1;
  else if (kind === "failed") state.webhookDeliveries.failed += 1;
  else state.webhookDeliveries.received += 1;
}

export function metrics(): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  out.push(["miro_workflows_build_info", 1]);
  out.push(["miro_workflows_uptime_seconds", Math.floor((Date.now() - state.bootEpochMs) / 1000)]);
  for (const [labels, count] of state.httpRequests) {
    out.push([`miro_workflows_http_requests_total{${labels}}`, count]);
  }
  for (const [labels, count] of state.httpDurationCount) {
    const sum = state.httpDurationSumMs.get(labels) ?? 0;
    out.push([`miro_workflows_http_request_duration_ms_sum{${labels}}`, Math.round(sum * 10) / 10]);
    out.push([`miro_workflows_http_request_duration_ms_count{${labels}}`, count]);
  }
  for (const [outcome, count] of state.runOutcomes) {
    out.push([`miro_workflows_workflow_runs_total{outcome="${outcome}"}`, count]);
  }
  out.push([`miro_workflows_webhook_deliveries_total{kind="received"}`, state.webhookDeliveries.received]);
  out.push([`miro_workflows_webhook_deliveries_total{kind="duplicate"}`, state.webhookDeliveries.duplicates]);
  out.push([`miro_workflows_webhook_deliveries_total{kind="failed"}`, state.webhookDeliveries.failed]);
  return out;
}

void metrics;
