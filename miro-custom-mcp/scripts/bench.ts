#!/usr/bin/env tsx
/**
 * miro-custom-mcp/scripts/bench.ts — MCP-only benchmark.
 *
 * Runs against FakeMiroApiClient (demo mode) — no network required.
 */
import { performance } from "node:perf_hooks";
import { tools } from "../src/tools/registry.js";
import { FakeMiroApiClient } from "../src/fake-miro-api.js";

const ITERATIONS = Number(process.env.BENCH_ITER ?? 10);

interface Row { name: string; p50_ms: number; p95_ms: number; n: number; }

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}
function round(n: number): number { return Math.round(n * 100) / 100; }

async function measure(label: string, fn: () => Promise<unknown>, n = ITERATIONS): Promise<Row> {
  const samples: number[] = [];
  await fn(); // warm-up
  for (let i = 0; i < n; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return { name: label, p50_ms: round(pct(samples, 0.5)), p95_ms: round(pct(samples, 0.95)), n };
}

async function main() {
  console.log("MCP benchmark — reproducible via `pnpm --filter miro-custom-mcp run bench`.");
  console.log("Iterations:", ITERATIONS);
  const client = new FakeMiroApiClient();
  const board = await client.createBoard({ name: "bench" });

  const rows: Row[] = [];
  rows.push(await measure("create_frame", async () => {
    await tools.find((t) => t.name === "create_frame")!.handler(client, {
      board_id: board.id, title: "Bench", x: 0, y: 0, width: 600, height: 800,
    });
  }));
  rows.push(await measure("batch_create_items(10)", async () => {
    await tools.find((t) => t.name === "batch_create_items")!.handler(client, {
      board_id: board.id,
      items: Array.from({ length: 10 }, (_, i) => ({ type: "sticky_note", content: `Idea ${i}`, x: i * 60, y: 0 })),
      stop_on_error: false, base_delay_ms: 0,
    });
  }));
  rows.push(await measure("get_board_items", async () => {
    await tools.find((t) => t.name === "get_board_items")!.handler(client, { board_id: board.id });
  }));
  console.log("\nMCP (FakeMiroApiClient, demo mode):");
  for (const r of rows) console.log(`  ${r.name.padEnd(28)} p50=${r.p50_ms}ms  p95=${r.p95_ms}ms  n=${r.n}`);

  console.log("\nWhat we DID NOT measure:");
  console.log("  - Live Miro REST RTT (requires MIRO_ACCESS_TOKEN).");
  console.log("  - Concurrent-request throughput (single-process).");
}

main().catch((err) => { console.error("Bench failed:", err); process.exit(1); });
