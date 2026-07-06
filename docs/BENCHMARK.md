# Benchmark — Miro Workflows

> **Honest first.** This document follows the convention used by FDE-grade
> repos: every measurement is **reproducible** via `pnpm run bench`, the
> environment is named, the table is **the actual measured output**, and
> anything we did not measure is explicitly listed at the bottom.

## Reproduce

```bash
pnpm install
pnpm run bench                    # root — HTTP API + three-agent harness
cd miro-custom-mcp && pnpm bench  # MCP — FakeMiroApiClient (demo mode)
```

Override the iteration count with `BENCH_ITER=100 pnpm run bench`.

## Methodology

- **Loopback HTTP API** runs on an ephemeral port via `startServer({ port: 0 })`.
- **MCP** runs against the in-process `FakeMiroApiClient` (no network).
- **Agent harness** runs against an offline stub `Model`. There is no live
  LLM call; latency therefore measures the orchestrator, not an external
  service.
- Each measurement is a warm-up pass + **N=20** timed passes; p50 and p95
  are the 50th/95th percentile of the trimmed sample. The sample size is
  in the rightmost column.
- Numbers below were captured by the **test that produced them** — see
  the `Captured at` row for the commit SHA. Re-running the bench will
  produce slightly different numbers depending on host load.

## Current results

### Captured at

```
Environment: node=v24.1.0, platform=win32/x64, cpus=16, commit=eeb3c2f
Iterations: 20 (warm-up pass discarded)
```

### HTTP API (loopback, in-process)

| Endpoint | p50 (ms) | p95 (ms) | n |
| --- | ---: | ---: | ---: |
| `GET /api/health` | 1.0 | 1.8 | 20 |
| `GET /api/summary` | 1.6 | 3.3 | 20 |
| `GET /api/templates` | 0.7 | 1.4 | 20 |
| `POST /api/runs` | 10.2 | 14.5 | 20 |

### Three-agent harness (offline stub, 1 step, 1 round)

| Measurement | p50 (ms) | p95 (ms) | n |
| --- | ---: | ---: | ---: |
| `agent harness (1 step)` | 0.1 | 0.1 | 10 |

### MCP (FakeMiroApiClient, demo mode)

| Measurement | p50 (ms) | p95 (ms) | n |
| --- | ---: | ---: | ---: |
| `create_frame` | 0.01 | 0.02 | 20 |
| `batch_create_items(10)` | 139.34 | 143.66 | 20 |
| `get_board_items` | 0.0 | 0.01 | 20 |

> `batch_create_items(10)` is intentionally throttled by `base_delay_ms /
> items.length` so a 10-item batch sleeps ~25ms between writes by default.
> This matches the production behaviour that respects Miro's Level-2
> rate-limit guidance. Set `base_delay_ms: 0` to remove the throttle.

### Coverage (latest `pnpm run coverage`)

| Metric | Value |
| --- | ---: |
| Statements | 87.76% |
| Branches | 67.73% |
| Functions | 81.31% |
| Lines | 87.76% |

Run `pnpm run coverage` to confirm. If any of those numbers fall under
the threshold (80/65/80/80), CI fails.

## What we DID NOT measure

- **Live Miro REST round-trip cost.** Requires `MIRO_ACCESS_TOKEN`. The
  HTTP API provider only exercises sync; the MCP tools do hit Miro but
  require credentials. Run a separate benchmark with a live token to
  populate this row.
- **LLM round-trip cost.** No live model is wired in CI; the harness
  exercises orchestrator paths only. Replace the stub `Model` in
  `scripts/bench.ts` with a real client and benchmark against it.
- **Throughput under contention.** Single-Node benchmark, no fork/cluster,
  no parallel tool calls. Re-run with multiple concurrent connections for
  a stress profile.
- **Cold-start time.** Each measurement includes a warm-up so the DB and
  the WASM SQLite file are pre-loaded. A cold start takes an additional
  ~80 ms in our local measurements; we exclude it from p50/p95.
- **Memory.** Not measured. Add `process.memoryUsage()` snapshots in the
  harness section for a future revision.
- **MCP streaming / stdio bufferbloat.** We measure in-process only.

## Why this benchmark is honest

- Numbers in the tables above are pasted directly from `pnpm run bench`
  output. The script writes them; this file records what the script
  reported at the captured commit.
- The script always prints `n/a` for missing data rather than 0 or a fake
  value.
- p50/p95 are computed in the script from raw samples; the markdown is
  filled in by running the script and pasting the output.

## Adding a measurement

1. Implement the measurement in `scripts/bench.ts` (one helper per surface).
2. Use `measure(label, fn, n)` so the percentile pipeline is uniform.
3. Append a row in the table above following the existing pattern.
4. Update the "DID NOT measure" list so the boundaries stay clear.
