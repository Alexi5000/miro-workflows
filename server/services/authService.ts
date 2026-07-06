/**
 * server/services/authService.ts — Bearer-token issuance + verification + auth wall.
 *
 * Design:
 *  - Plaintext tokens are random 32+ char strings; once issued they are shown
 *    ONCE and never returned again.
 *  - We store an HMAC-SHA256 digest + the first 8 chars of the plaintext as a
 *    lookup prefix. So DB breach doesn't yield usable tokens.
 *  - Tokens are workspace-scoped + scope-bounded. Every request that mutates
 *    state must pass through `requireScope()` middleware.
 *
 * In test/dev mode the secret defaults to a deterministic string so tests are
 * hermetic. Production MUST set `MIRO_WORKFLOWS_TOKEN_SECRET` (a 32+ byte
 * random string) and rotate via this service's API.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { repository } from "../db/database.js";
import { issueTokenContractV1, authHeaderContractV1, bearerV1, authResultContractV1, authVerifyContractV1, AUTH_CONTRACT_VERSION } from "../../shared/contracts/index.js";
import type { AuthToken } from "../../shared/types.js";
import type { AuthVerifyResultV1, AuthResultContractV1, IssueTokenContractV1, TokenScope } from "../../shared/contracts/index.js";

const SECRET = process.env.MIRO_WORKFLOWS_TOKEN_SECRET || "dev-secret-do-not-use-in-prod";
const TOKEN_BYTES = 32;
const PREFIX_LEN = 8;

function digest(plaintext: string): string {
  return createHmac("sha256", SECRET).update(plaintext).digest("hex");
}

/** Returned to the client once at issuance; never persisted. */
export interface IssuedToken extends AuthToken {
  plaintext: string;
  expiresAt: string;
}

export class AuthError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const DEFAULT_SCOPES: TokenScope[] = ["dashboard:read", "workspaces:read", "runs:read", "audit:read"];

export async function issueToken(raw: unknown): Promise<IssuedToken> {
  const input: IssueTokenContractV1 = issueTokenContractV1.parse(raw);
  const plaintext = "mw_" + randomBytes(TOKEN_BYTES).toString("hex");
  const prefix = plaintext.slice(0, PREFIX_LEN);
  const now = new Date();
  const expires = new Date(now.getTime() + input.ttlSeconds * 1000);
  const id = `tok-${randomBytes(8).toString("hex")}`;
  await repository.createAuthToken({
    id,
    workspaceId: input.workspaceId,
    label: input.label,
    prefix,
    digest: digest(plaintext),
    scopes: input.scopes as string[],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    createdBy: input.label,
  });
  await repository.createAuditEvent({
    workspaceId: input.workspaceId,
    runId: null,
    eventType: "auth.token.issued",
    severity: "info",
    message: `Issued token '${input.label}' (scopes: ${input.scopes.join(",")}).`,
    metadata: { tokenId: id, scopes: input.scopes, ttlSeconds: input.ttlSeconds },
  });
  return {
    id,
    workspaceId: input.workspaceId,
    label: input.label,
    prefix,
    digest: digest(plaintext),
    scopes: input.scopes as string[],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    createdBy: input.label,
    plaintext,
  };
}

export async function issueBootstrapToken(workspaceId: string, label = "bootstrap"): Promise<IssuedToken> {
  return issueToken({ workspaceId, label, scopes: DEFAULT_SCOPES, ttlSeconds: 24 * 3600 });
}

export async function verifyBearer(rawHeader: string | undefined | null): Promise<AuthVerifyResultV1> {
  if (!rawHeader) return { status: "invalid" };
  const parsed = authHeaderContractV1.safeParse({ authorization: rawHeader });
  if (!parsed.success) return { status: "invalid" };
  const token = bearerV1.parse({ authorization: rawHeader });
  const prefix = token.slice(0, PREFIX_LEN);
  const stored = await repository.findAuthTokenByPrefix(prefix);
  if (!stored || stored.revokedAt) return { status: "denied", reason: "Token not found or revoked." };
  const candidate = digest(token);
  const expected = Buffer.from(stored.digest, "hex");
  const got = Buffer.from(candidate, "hex");
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    return { status: "invalid" };
  }
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    return { status: "expired" };
  }
  await repository.touchAuthToken(stored.id);
  return {
    status: "ok",
    token: {
      id: stored.id,
      label: stored.label,
      workspaceId: stored.workspaceId,
      scopes: stored.scopes as TokenScope[],
      expiresAt: stored.expiresAt,
    },
  };
}

export function hasScope(result: AuthVerifyResultV1, scope: TokenScope): boolean {
  return result.status === "ok" && (result.token.scopes as TokenScope[]).includes(scope);
}

export async function revokeToken(id: string): Promise<void> {
  await repository.revokeAuthToken(id);
}

export async function listWorkspaceTokens(workspaceId: string): Promise<AuthToken[]> {
  return repository.listAuthTokensByWorkspace(workspaceId);
}

export const AUTH_VERSION = AUTH_CONTRACT_VERSION;

// Self-check at module load: warn if production is using the dev secret.
if (process.env.NODE_ENV === "production" && SECRET === "dev-secret-do-not-use-in-prod") {
  console.warn("[auth] MIRO_WORKFLOWS_TOKEN_SECRET is unset in production — using dev fallback. SET THIS IMMEDIATELY.");
}

/** Convenience hash for one-off masking (debugging). */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export { SECRET as TOKEN_SIGNING_SECRET };

