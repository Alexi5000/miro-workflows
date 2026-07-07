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
import { encryptToken, decryptToken, TokenCipherError } from "./tokenCipher.js";
import { pickOAuthClient, type MiroOAuthClient, type DeviceCodeResponse, type TokenResponse } from "./oauthClient.js";

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

/**
 * ---------------------------------------------------------------------------
 * v1.1: OAuth 2.0 device-flow helpers.
 * ---------------------------------------------------------------------------
 */

export interface OAuthFlowResult {
  flowId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
}

/** Start a device-flow session. Persists a row in `oauth_device_flows`. */
export async function startOAuthDeviceFlow(opts: { workspaceId: string; clientId?: string; scope?: string }): Promise<OAuthFlowResult> {
  const client = pickOAuthClient();
  const id = `flow-${randomBytes(8).toString("hex")}`;
  const device: DeviceCodeResponse = await client.requestDeviceCode({ clientId: opts.clientId ?? "", scope: opts.scope });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + device.expiresIn * 1000).toISOString();
  await repository.upsertDeviceFlow({
    id,
    workspaceId: opts.workspaceId,
    clientId: opts.clientId ?? (process.env.MIRO_OAUTH_CLIENT_ID ?? ""),
    deviceCode: device.deviceCode,
    userCode: device.userCode,
    verificationUri: device.verificationUri,
    expiresAt,
    intervalSec: device.interval,
  });
  return { flowId: id, userCode: device.userCode, verificationUri: device.verificationUri, expiresIn: device.expiresIn };
}

/** Poll the device-flow once; on success, persist encrypted access + refresh
 *  tokens to `integration_credentials` and link the flow. */
export async function pollOAuthDeviceFlow(flowId: string): Promise<{ status: "pending" | "slow_down" | "expired" | "denied" | "ok"; credentialId?: string; tokenId?: string }> {
  const flow = await repository.getDeviceFlow(flowId);
  if (!flow) return { status: "expired" };
  if (new Date(flow.expiresAt).getTime() <= Date.now()) {
    await repository.updateDeviceFlow(flowId, { status: "expired" });
    return { status: "expired" };
  }
  const client: MiroOAuthClient = pickOAuthClient();
  const result = await client.pollForToken({
    clientId: flow.clientId,
    clientSecret: process.env.MIRO_OAUTH_CLIENT_SECRET ?? "",
    deviceCode: flow.deviceCode,
    intervalSec: flow.intervalSec,
  });
  if (result.status !== "ok") {
    await repository.updateDeviceFlow(flowId, { status: result.status, lastPolledAt: new Date().toISOString() });
    return { status: result.status };
  }
  return await finalizeOAuthFlow(flowId, flow.workspaceId, flow.clientId, result.tokens);
}

async function finalizeOAuthFlow(flowId: string, workspaceId: string, clientId: string, tokens: TokenResponse) {
  const credentialId = `cred-${randomBytes(8).toString("hex")}`;
  const label = `OAuth ${clientId || "device-flow"} ${new Date().toISOString().slice(0, 16)}`;
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
  // Encrypt the tokens at rest.
  const accessEnc = encryptToken(tokens.accessToken, credentialId);
  const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken, credentialId) : null;
  await repository.upsertCredential({
    id: credentialId,
    workspaceId,
    provider: "miro",
    credentialLabel: label,
    scopes: tokens.scope ? tokens.scope.split(/\s+/) : ["boards:read", "boards:write"],
    expiresAt,
    status: "connected",
    fromOAuthDeviceFlow: true,
  });
  await repository.updateDeviceFlow(flowId, { status: "ok", credentialId, lastPolledAt: new Date().toISOString() });
  await repository.createAuditEvent({
    workspaceId,
    runId: null,
    eventType: "oauth.device_flow.completed",
    severity: "info",
    message: `OAuth device flow ${flowId} completed; credential ${credentialId} attached.`,
    metadata: { credentialId, expiresAt, scopes: tokens.scope },
  });
  return { status: "ok" as const, credentialId };
}

/** Decrypt a stored access token. Used by the dashboard's live provider. */
export function readAccessToken(credentialId: string, cipher: Buffer, iv: Buffer): string {
  try {
    return decryptToken(cipher, iv, credentialId);
  } catch (err) {
    if (err instanceof TokenCipherError) {
      throw new AuthError(500, "decrypt_failed", `Could not decrypt access token: ${err.message}`);
    }
    throw err;
  }
}

