import { z } from "zod";

/**
 * Sprint contract package — typed, versioned, and shared across:
 *  - the HTTP API (`/api/runs` body)
 *  - the MCP package (any tool that emits a workflow run)
 *  - the dashboard (`src/api.ts` request body)
 *
 * Versioning rules:
 *  - Files are named `*.contract.v<n>.ts`.
 *  - Every change to the shape bumps `SPRINT_CONTRACT_VERSION` (and
 *    sibling `AUDIT_CONTRACT_VERSION`, `RUN_RESULT_CONTRACT_VERSION`).
 *  - Older versions are kept for at least one minor release so old
 *    payloads still parse.
 *  - `scripts/check_contract_versions.ts` enforces monotonic versions.
 */

// ---------------------------------------------------------------------------
// v1 — initial sprint / audit / run-result contracts.
// ---------------------------------------------------------------------------

export const SPRINT_CONTRACT_VERSION = "1.0.0" as const;
export const AUDIT_CONTRACT_VERSION = "1.0.0" as const;
export const RUN_RESULT_CONTRACT_VERSION = "1.0.0" as const;

export const SprintSeveritySchema = z.enum(["info", "warning", "error"]);
export type SprintSeverity = z.infer<typeof SprintSeveritySchema>;

/**
 * The sprint input contract — exactly the body shape accepted by
 * `POST /api/runs` and any MCP tool that triggers a workflow run.
 */
export const sprintContractV1 = z.object({
  /** Slug of the template to execute; required. */
  templateSlug: z.string().min(1, "templateSlug must not be empty"),
  /** Optional board ID override; defaults to template's defaultBoardId. */
  boardId: z.string().optional(),
  /** Free-form identifier for who triggered the run. */
  triggeredBy: z.string().min(1).default("local-user"),
  /** Optional parameters passed to the template's steps. */
  parameters: z.record(z.string(), z.unknown()).optional(),
});
export type SprintContractV1 = z.infer<typeof sprintContractV1>;

/**
 * The audit event contract — every audit row validates against this.
 */
export const auditEventContractV1 = z.object({
  workspaceId: z.string().min(1),
  runId: z.string().nullable().default(null),
  eventType: z.string().min(1),
  severity: SprintSeveritySchema.default("info"),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type AuditEventContractV1 = z.infer<typeof auditEventContractV1>;

/**
 * The run-result contract — what `/api/runs` returns after starting a run.
 */
export const runResultContractV1 = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  templateName: z.string().optional(),
  boardId: z.string().min(1),
  boardName: z.string().optional(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  triggeredBy: z.string(),
  summary: z.string(),
  metrics: z.object({
    totalSteps: z.number().int().nonnegative(),
    completedSteps: z.number().int().nonnegative(),
    createdItems: z.number().int().nonnegative(),
    syncDurationMs: z.number().nonnegative(),
    riskScore: z.number().min(1).max(10),
  }),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});
export type RunResultContractV1 = z.infer<typeof runResultContractV1>;

// ---------------------------------------------------------------------------
// Registry + dispatcher. Adding a new version: add it here, add the file,
// bump the test in `shared/contracts/contract.test.ts`.
// ---------------------------------------------------------------------------

export interface ContractDescriptor<TInput, TOutput> {
  version: string;
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>;
}

export const SPRINT_CONTRACTS: Record<string, ContractDescriptor<unknown, SprintContractV1>> = {
  "1.0.0": { version: "1.0.0", schema: sprintContractV1 as unknown as z.ZodType<SprintContractV1, z.ZodTypeDef, unknown> },
};

export const AUDIT_CONTRACTS: Record<string, ContractDescriptor<unknown, AuditEventContractV1>> = {
  "1.0.0": { version: "1.0.0", schema: auditEventContractV1 as unknown as z.ZodType<AuditEventContractV1, z.ZodTypeDef, unknown> },
};

export const RUN_RESULT_CONTRACTS: Record<string, ContractDescriptor<unknown, RunResultContractV1>> = {
  "1.0.0": { version: "1.0.0", schema: runResultContractV1 as unknown as z.ZodType<RunResultContractV1, z.ZodTypeDef, unknown> },
};

export type ContractKind = "sprint" | "audit" | "run_result";

export function listContractVersions(kind: ContractKind): string[] {
  const map = pickRegistry(kind);
  return Object.keys(map).sort(compareSemverDesc);
}

export function parseContract<T>(
  kind: ContractKind,
  input: unknown,
  options: { version?: string } = {},
): { version: string; value: T } {
  const map = pickRegistry(kind);
  const requested = options.version ?? defaultLatest(kind);
  const descriptor = map[requested];
  if (!descriptor) {
    throw new Error(
      `Unknown contract version for ${kind}: ${requested}. Known: ${Object.keys(map).join(", ")}`,
    );
  }
  const parsed = descriptor.schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Contract ${kind} v${requested} validation failed — ${message}`);
  }
  return { version: requested, value: parsed.data as T };
}

function pickRegistry(kind: ContractKind): Record<string, ContractDescriptor<unknown, unknown>> {
  if (kind === "sprint") return SPRINT_CONTRACTS as unknown as Record<string, ContractDescriptor<unknown, unknown>>;
  if (kind === "audit") return AUDIT_CONTRACTS as unknown as Record<string, ContractDescriptor<unknown, unknown>>;
  return RUN_RESULT_CONTRACTS as unknown as Record<string, ContractDescriptor<unknown, unknown>>;
}

function defaultLatest(kind: ContractKind): string {
  return listContractVersions(kind)[0] ?? "1.0.0";
}

function compareSemverDesc(a: string, b: string): number {
  const [aMaj, aMin, aPat] = a.split(".").map(Number);
  const [bMaj, bMin, bPat] = b.split(".").map(Number);
  if (aMaj !== bMaj) return bMaj - aMaj;
  if (aMin !== bMin) return bMin - aMin;
  return (bPat ?? 0) - (aPat ?? 0);
}
