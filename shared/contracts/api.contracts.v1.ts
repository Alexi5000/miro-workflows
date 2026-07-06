/**
 * shared/contracts/api.contracts.v1.ts — Per-endpoint request body contracts.
 *
 * Why per-endpoint and not a single mega-schema:
 *  - Different routes accept different shapes; over-permissive zod objects
 *    hide typos like `templateSlug` being sent to the workspace endpoint.
 *  - These contracts are the canonical input types. `bootstrap.ts` parses
 *    against them and returns 400 with structured `{ error, issues }` on failure.
 */
import { z } from "zod";
import { tokenScopes } from "./auth.contract.v1.js";

const workspaceIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9_\-]+$/i, "workspaceId must be alphanumeric");

/** POST /api/runs */
export const startRunContractV1 = z.object({
  templateSlug: z.string().min(1).max(120),
  boardId: z.string().min(1).max(64).optional(),
  triggeredBy: z.string().min(1).max(80).default("local-user"),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/credentials */
export const upsertCredentialContractV1 = z.object({
  workspaceId: workspaceIdSchema,
  credentialLabel: z.string().min(1).max(80).default("Miro OAuth credential"),
  scopes: z.array(z.string().min(1).max(80)).min(0).max(20).default([]),
  expiresAt: z.string().datetime().optional(),
});

/** POST /api/workspaces/:id/oauth/device-code (no body required, but the workspaceId is in the path). */
export const workspaceIdPathContractV1 = z.object({
  workspaceId: workspaceIdSchema,
});

/** GET /api/runs */
export const listRunsQueryContractV1 = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

/** GET /api/audit-events */
export const listAuditQueryContractV1 = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

/** POST /api/auth/tokens */
export const issueAuthTokenContractV1 = z.object({
  workspaceId: workspaceIdSchema,
  label: z.string().min(1).max(80).default("dashboard-token"),
  scopes: z.array(z.enum(tokenScopes)).min(1).max(20),
  ttlSeconds: z.number().int().min(60).max(86_400).default(3600),
});

/** Generic helper: returns the parsed value or throws a structured 400. */
export function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, routeName: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join(".") || "<root>", message: i.message }));
    const err = new Error(`Contract ${routeName} validation failed`);
    (err as Error & { issues?: unknown }).issues = issues;
    throw err;
  }
  return parsed.data;
}
