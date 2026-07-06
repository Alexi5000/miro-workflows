/**
 * shared/contracts/auth.contract.v1.ts — Bearer token + session contracts.
 *
 * Production note:
 * - `tokenPlaintext` is a one-time secret returned at issuance.
 * - The DB stores only an HMAC-SHA256 digest + a small prefix (so we can look
 *   up by prefix without storing the raw token).
 * - Sessions are sliding 1 hour, max 24 hour absolute.
 */
import { z } from "zod";

export const AUTH_CONTRACT_VERSION = "1.0.0" as const;

export const tokenScopes = [
  "dashboard:read",
  "dashboard:write",
  "workspaces:read",
  "workspaces:write",
  "credentials:read",
  "credentials:write",
  "runs:read",
  "runs:write",
  "audit:read",
  "webhooks:write",
] as const;
export type TokenScope = (typeof tokenScopes)[number];

export const issueTokenContractV1 = z.object({
  workspaceId: z.string().min(1),
  label: z.string().min(1).max(80),
  scopes: z.array(z.enum(tokenScopes)).min(1),
  ttlSeconds: z.number().int().min(60).max(86_400).default(3600),
});

export const authHeaderContractV1 = z.object({
  authorization: z.string().regex(/^Bearer\s+[a-z0-9_]{16,128}$/i),
});

export const bearerV1 = authHeaderContractV1.transform((v) => v.authorization.replace(/^Bearer\s+/i, ""));

/** Result of verifying a bearer (no plaintext returned here — it's already gone). */
export const authVerifyContractV1 = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), token: z.object({ id: z.string(), label: z.string(), workspaceId: z.string(), scopes: z.array(z.enum(tokenScopes)), expiresAt: z.string() }) }),
  z.object({ status: z.literal("expired") }),
  z.object({ status: z.literal("invalid") }),
  z.object({ status: z.literal("denied"), reason: z.string() }),
]);

/** Result of issuing a token (plaintext is returned ONCE here). */
export const authResultContractV1 = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), token: z.object({ id: z.string(), label: z.string(), workspaceId: z.string(), scopes: z.array(z.enum(tokenScopes)), expiresAt: z.string() }), plaintext: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]);

export type AuthHeaderContractV1 = z.infer<typeof authHeaderContractV1>;
export type IssueTokenContractV1 = z.infer<typeof issueTokenContractV1>;
export type AuthVerifyResultV1 = z.infer<typeof authVerifyContractV1>;
export type AuthResultContractV1 = z.infer<typeof authResultContractV1>;
