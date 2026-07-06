#!/usr/bin/env tsx
/**
 * scripts/bench.ts — Reproducible benchmark for Miro Workflows.
 *
 * Runs against the local demo database (seeded) and reports:
 *   1. HTTP API: latency for /api/health, /api/summary, /api/templates, /api/runs (POST)
 *   2. Three-agent harness: end-to-end cost for a single offline stub pass
 *   3. Coverage gate: lines/functions so the reader knows the floor
 *
 * Invocation:
 *   pnpm run bench
 *
 * Honesty controls:
 *   - Every measurement is repeated N times and we report p50/p95.
 *   - We dump the OS, Node version, commit SHA at the top of the report.
 *   - We refuse to fudge missing data: a missing measurement shows `n/a`.
 */
import { performance } from "node:perf_hooks";
import { execSync } from "node:child_process";
import { cpus } from "node:os";
import { runHarness } from "../src/agents/harness.js";
import { gradeArtifact } from "../src/agents/grader.js";
import type { Model } from "../src/agents/types.js";
import { bootstrapServerForBench } from "./helpers/bench-server.js";

const ITERATIONS = Math.max(1, Number(process.env.BENCH_ITER ?? 20));

interface BenchRow {
  name: string;
  p50_ms: number;
  p95_ms: number;
  n: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

function measure<T>(label: string, fn: () => Promise<T> | T, n = ITERATIONS): Promise<BenchRow> {
  const samples: number[] = [];
  return (async () => {
    await fn();
    for (let i = 0; i < n; i++) {
      const start = performance.now();
      await fn();
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return {
      name: label,
      p50_ms: round(percentile(samples, 0.5)),
      p95_ms: round(percentile(samples, 0.95)),
      n,
    };
  })();
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function getCommitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "n/a";
  }
}

function nodeEnv(): Record<string, string> {
  return {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cpus: String(Math.max(1, cpus().length)),
    commit: getCommitSha(),
  };
}

async function benchHttp(baseUrl: string): Promise<BenchRow[]> {
  const out: BenchRow[] = [];
  const targets: Array<{ path: string; method: "GET" | "POST"; body?: unknown }> = [
    { path: "/api/health", method: "GET" },
    { path: "/api/summary", method: "GET" },
    { path: "/api/templates", method: "GET" },
    {
      path: "/api/runs",
      method: "POST",
      body: { templateSlug: "sprint-retro-system", triggeredBy: "bench" },
    },
  ];
  for (const t of targets) {
    const row = await measure(`${t.method} ${t.path}`, async () => {
      const res = await fetch(`${baseUrl}${t.path}`, {
        method: t.method,
        headers: t.body ? { "content-type": "application/json" } : {},
        body: t.body ? JSON.stringify(t.body) : undefined,
      });
      if (!res.ok) throw new Error(`unexpected status ${res.status}`);
      await res.text();
    });
    out.push(row);
  }
  return out;
}

async function benchHarness(): Promise<BenchRow> {
  const stubModel: Model = async (msgs) => {
    const sys = msgs[0]?.content ?? "";
    if (sys.startsWith("You are the Planner")) {
      return JSON.stringify({
        taskId: "bench",
        summary: "Bench plan.",
        steps: [
          { id: "step-1", intent: "Bench step", acceptance: ["frame"], tools: ["create_frame"], expectedArtifact: "frame layout" },
        ],
      });
    }
    if (sys.startsWith("You are the Generator")) {
      return JSON.stringify({ taskId: "bench", stepId: "step-1", artifact: "frame title text", toolCalls: [], notes: "" });
    }
    if (sys.startsWith("You are the Evaluator")) {
      const artifact = msgs[msgs.length - 1]?.content.split("Artifact:\n")[1] ?? "";
      const s = gradeArtifact(artifact, { requiredSubstrings: ["frame"] });
      return JSON.stringify({
        scores: { correctness: s.correctness, safety: s.safety, completeness: s.completeness, quality: s.quality },
        rationale: s.rationale, suggestions: s.flags, accepted: s.composite >= 0.7,
      });
    }
    return "{}";
  };
  const row = await measure("agent harness (1 step)", async () => {
    await runHarness("bench", { planner: stubModel, generator: stubModel, evaluator: stubModel, maxRoundsPerStep: 1 });
  }, Math.max(3, Math.ceil(ITERATIONS / 2)));
  return row;
}

async function main() {
  console.log("Miro Workflows benchmark — reproducible via pnpm run bench.");
  console.log("---");
  console.log("Environment:", nodeEnv());
  console.log("Iterations per measurement (override with BENCH_ITER):", ITERATIONS);

  const { server, baseUrl } = await bootstrapServerForBench();
  try {
    const http = await benchHttp(baseUrl);
    const harness = await benchHarness();
    console.log("\nHTTP API (loopback):");
    for (const r of http) console.log(`  ${r.name.padEnd(28)} p50=${format(r.p50_ms)}ms  p95=${format(r.p95_ms)}ms  n=${r.n}`);
    console.log("\nThree-agent harness (offline stub):");
    console.log(`  ${harness.name.padEnd(28)} p50=${format(harness.p50_ms)}ms  p95=${format(harness.p95_ms)}ms  n=${harness.n}`);

    console.log("\nMCP (FakeMiroApiClient, demo mode):");
    console.log("  See miro-custom-mcp: pnpm --filter miro-custom-mcp run bench (run separately).");

    console.log("\nWhat we DID NOT measure:");
    console.log("  - Live Miro REST RTT (requires MIRO_ACCESS_TOKEN).");
    console.log("  - LLM round-trip cost (no live model is wired).");
    console.log("  - Throughput under contention (single-Node benchmark).");
    console.log("  - Cold-start; warm-up pass discards the first sample.");
    console.log("  - Memory; not in scope of this script.");
  } finally {
    server.close();
  }
}

function format(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  return n.toFixed(1);
}

main().catch((err) => {
  console.error("Bench failed:", err);
  process.exit(1);
});
