import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, resolve } from "node:path";
import { getConfig } from "./config.js";
import { repository } from "./db/database.js";
import { ResponseError, startWorkflowRun, syncBoards } from "./services/workflowService.js";
import { AuthError, hasScope, issueToken, listWorkspaceTokens, revokeToken, verifyBearer } from "./services/authService.js";
import { incHttpRequest, incRunOutcome, incWebhookDelivery, metrics, observeHttpDuration } from "./metrics.js";
import {
  startRunContractV1,
  upsertCredentialContractV1,
  listRunsQueryContractV1,
  listAuditQueryContractV1,
  issueAuthTokenContractV1,
  workspaceIdPathContractV1,
  parseOrThrow,
} from "../shared/contracts/index.js";
import type { z } from "zod";

export interface StartServerOptions {
  port?: number;
  corsOrigin?: string;
  /** Max request body size in bytes. Default 1 MiB. */
  maxBodyBytes?: number;
}

type Verified = Awaited<ReturnType<typeof import("./services/authService.js").verifyBearer>>;
interface RequestContext {
  requestId: string;
  auth: Verified;
}

/** Read a request body with a hard byte cap. Rejects with `ResponseError` on overflow. */
async function readBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise<string>((resolveBody, reject) => {
    let bytes = 0;
    let body = "";
    let aborted = false;
    request.on("data", (chunk) => {
      if (aborted) return;
      bytes += (chunk as Buffer).length;
      if (bytes > maxBytes) {
        aborted = true;
        // Drain remaining data without buffering it.
        body += chunk.subarray(0, Math.max(0, maxBytes - (bytes - (chunk as Buffer).length)));
        request.removeAllListeners("data");
        request.on("data", () => {});
        request.on("end", () => reject(new ResponseError(413, `Request body too large (>${maxBytes} bytes)`)));
        request.on("error", (err) => reject(new ResponseError(413, `Request body too large or read failed`)));
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      if (!aborted) resolveBody(body);
    });
    request.on("error", (err) => {
      if (aborted) return;
      reject(err);
    });
  });
}

/** Safe JSON parse that returns a 400 `ResponseError` on parse failure. */
function parseBody(raw: string): unknown {
  if (raw === "") return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ResponseError(400, `Invalid JSON body — ${msg.slice(0, 200)}`);
  }
}

function send(response: ServerResponse, status: number, data: unknown, corsOrigin: string) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": corsOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(data, null, 2));
}

function buildHandler(corsOrigin: string, maxBodyBytes: number) {
  const config = getConfig();
  const jsonHeaders = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": corsOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-request-id",
  };
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };

  let bootPromise: Promise<unknown> | null = null;
  const ready = () => {
    if (!bootPromise) bootPromise = repository.migrate();
    return bootPromise;
  };

  return async function handle(request: IncomingMessage, response: ServerResponse) {
    await ready();
    if (!request.url) {
      send(response, 400, { error: "Missing URL" }, corsOrigin);
      return;
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204, jsonHeaders);
      response.end();
      return;
    }
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const path = url.pathname;
    const requestId = request.headers["x-request-id"]?.toString() ?? `req-${crypto.randomUUID().slice(0, 8)}`;
    const startedAt = performance.now();

    /** Mutable per-request state passed via closure. */
    const ctx: RequestContext = { requestId, auth: { status: "invalid" } };

    /** Per-handler wrapper around the module-level `send` that also writes an access log line. */
    const sendLogged = (status: number, data: unknown) => {
      send(response, status, data, corsOrigin);
      const ms = (performance.now() - startedAt);
      incHttpRequest(request.method ?? "GET", path, status);
      observeHttpDuration(request.method ?? "GET", path, status, ms);
      const ws = ctx.auth.status === "ok" ? ctx.auth.token.workspaceId : "-";
      process.stdout.write(JSON.stringify({
        level: "info", msg: "http.access", time: new Date().toISOString(),
        requestId, method: request.method, path, status, durMs: Math.round(ms * 10) / 10, workspace: ws,
      }) + "\n");
    };

    /** Auth wall helper — used by every write route. */
    async function requireScope(scope: string): Promise<{ workspaceId: string; tokenId: string } | null> {
      const result = await verifyBearer(request.headers["authorization"]);
      ctx.auth = result;
      if (result.status !== "ok") {
        const status = result.status === "expired" ? 401 : result.status === "denied" ? 403 : 401;
        const reason = result.status === "denied" ? result.reason : `Bearer ${result.status}`;
        sendLogged(status, { error: reason });
        return null;
      }
      if (!hasScope(result, scope as never)) {
        sendLogged(403, { error: `Scope '${scope}' required.` });
        return null;
      }
      return { workspaceId: result.token.workspaceId, tokenId: result.token.id };
    }

    /** Per-handler zod wrapper that returns null + 400 if invalid. */
    function parseOrSend400<T>(schema: z.ZodType<T>, raw: unknown, routeName: string): T | null {
      try {
        return parseOrThrow(schema, raw, routeName);
      } catch (err) {
        const issues = (err as Error & { issues?: unknown }).issues ?? String(err);
        sendLogged(400, { error: `Invalid request: ${routeName}`, issues });
        return null;
      }
    }

    try {
      if (path === "/api/health") {
        return sendLogged(200, { status: "ok", mode: config.providerMode, databasePath: config.databasePath, timestamp: new Date().toISOString() });
      }
      if (path === "/api/summary") return sendLogged(200, repository.getSummary());
      if (path === "/api/workspaces")
        return sendLogged(200, { data: repository.listWorkspaces(), credentials: repository.listCredentials() });
      if (path === "/api/boards") return sendLogged(200, { data: repository.listBoards() });
      if (path === "/api/templates") return sendLogged(200, { data: repository.listTemplates() });
      if (path.startsWith("/api/templates/")) {
        const template = repository.getTemplateBySlug(decodeURIComponent(path.split("/").pop() || ""));
        return sendLogged(template ? 200 : 404, template || { error: "Template not found" });
      }
      if (path === "/api/runs" && request.method === "GET") {
        const q = parseOrSend400(listRunsQueryContractV1, Object.fromEntries(url.searchParams), "GET /api/runs");
        if (!q) return;
        return sendLogged(200, { data: repository.listRuns(q.limit) });
      }
      if (path === "/api/runs" && request.method === "POST") {
        const body = parseOrSend400(startRunContractV1, parseBody(await readBody(request, maxBodyBytes)), "POST /api/runs");
        if (!body) return;
        const started = await startWorkflowRun(body);
        if (!started) {
          return sendLogged(500, { error: "Workflow run did not produce a record." });
        }
        incRunOutcome(started.status === "completed" ? "completed" : "failed");
        return sendLogged(201, started);
      }
      if (path.startsWith("/api/runs/")) {
        const run = repository.getRun(decodeURIComponent(path.split("/").pop() || ""));
        return sendLogged(run ? 200 : 404, run || { error: "Run not found" });
      }
      if (path === "/api/audit-events") {
        const q = parseOrSend400(listAuditQueryContractV1, Object.fromEntries(url.searchParams), "GET /api/audit-events");
        if (!q) return;
        return sendLogged(200, { data: repository.listAuditEvents({ limit: q.limit }) });
      }
      if (path === "/api/sync/boards" && request.method === "POST")
        return sendLogged(200, { data: await syncBoards() });

      if (path.startsWith("/api/boards/") && path.endsWith("/items") && request.method === "GET") {
        const boardId = decodeURIComponent(path.split("/")[3] || "");
        const board = repository.getBoard(boardId);
        if (!board) return sendLogged(404, { error: "Board not found" });
        const allRuns = repository.listRuns(50);
        const matching = allRuns.filter((r) => r.boardId === boardId);
        const items = matching.flatMap((r) => repository.listBoardItems(r.id));
        return sendLogged(200, { data: items, board });
      }

      if (path === "/api/credentials" && request.method === "POST") {
        const auth = await requireScope("credentials:write");
        if (!auth) return;
        const body = parseOrSend400(upsertCredentialContractV1, parseBody(await readBody(request, maxBodyBytes)), "POST /api/credentials");
        if (!body) return;
        if (body.workspaceId !== auth.workspaceId) {
          return sendLogged(403, { error: "Cannot add credentials to a different workspace." });
        }
        const workspace = repository.listWorkspaces().find((w) => w.id === body.workspaceId);
        if (!workspace) return sendLogged(404, { error: "Workspace not found" });
        const record = {
          id: `cred-${crypto.randomUUID()}`,
          workspaceId: body.workspaceId,
          provider: "miro" as const,
          credentialLabel: body.credentialLabel ?? "Miro OAuth credential",
          scopes: body.scopes ?? [],
          expiresAt: body.expiresAt ?? new Date(Date.now() + 3600_000).toISOString(),
          status: "connected" as const,
          fromOAuthDeviceFlow: true,
        };
        await repository.upsertCredential(record);
        await repository.createAuditEvent({
          workspaceId: body.workspaceId,
          runId: null,
          eventType: "credential.added",
          severity: "info",
          message: `Credential '${body.credentialLabel}' added for workspace ${workspace.name}.`,
          metadata: { credentialLabel: body.credentialLabel, scopes: body.scopes },
        });
        return sendLogged(201, { credential: record, deviceFlow: null });
      }
      if (path.startsWith("/api/credentials/") && request.method === "DELETE") {
        // Demo: we keep audit-only metadata; deletion is a no-op + audit row.
        const id = decodeURIComponent(path.split("/").pop() || "");
        await repository.createAuditEvent({
          workspaceId: repository.listWorkspaces()[0]?.id || "ws-demo",
          runId: null,
          eventType: "credential.revoked",
          severity: "warning",
          message: `Credential ${id} revoked from dashboard.`,
          metadata: { credentialId: id },
        });
        return sendLogged(200, { ok: true });
      }

      if (path.match(/^\/api\/workspaces\/[^/]+\/oauth\/device-code$/) && request.method === "POST") {
        const auth = await requireScope("credentials:write");
        if (!auth) return;
        const pathMatch = path.match(/^\/api\/workspaces\/([^/]+)\/oauth\/device-code$/);
        if (!pathMatch) return sendLogged(404, { error: "Not found" });
        const pathParams = parseOrSend400(workspaceIdPathContractV1, { workspaceId: decodeURIComponent(pathMatch[1]) }, "POST /api/workspaces/:id/oauth/device-code");
        if (!pathParams) return;
        const workspaceId = pathParams.workspaceId;
        // OAuth device flow stub: in production this is a remote call to
        // Miro's `/oauth/device/code` endpoint. In demo mode we return a
        // plausible shape so the UI can show the user-code / verification URI.
        const userCode = `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await repository.createAuditEvent({
          workspaceId,
          runId: null,
          eventType: "oauth.device_flow.started",
          severity: "info",
          message: `OAuth device-flow started for workspace ${workspaceId}.`,
          metadata: { userCode },
        });
        return sendLogged(200, {
          userCode,
          verificationUri: "https://miro.com/oauth/device",
          expiresIn: 600,
        });
      }

      // -----------------------------------------------------------------
      // Auth token management (issue / list / revoke).
      // -----------------------------------------------------------------
      if (path === "/api/auth/tokens" && request.method === "POST") {
        const auth = await requireScope("dashboard:write");
        if (!auth) return;
        const body = parseOrSend400(issueAuthTokenContractV1, parseBody(await readBody(request, maxBodyBytes)), "POST /api/auth/tokens");
        if (!body) return;
        if (body.workspaceId !== auth.workspaceId) {
          return sendLogged(403, { error: "Cannot issue tokens for a different workspace." });
        }
        const issued = await issueToken(body);
        return sendLogged(201, {
          id: issued.id,
          workspaceId: issued.workspaceId,
          label: issued.label,
          scopes: issued.scopes,
          expiresAt: issued.expiresAt,
          plaintext: issued.plaintext,
        });
      }
      if (path === "/api/auth/tokens" && request.method === "GET") {
        const auth = await requireScope("dashboard:read");
        if (!auth) return;
        const tokens = await listWorkspaceTokens(auth.workspaceId);
        return sendLogged(200, { data: tokens.map((t) => ({ id: t.id, label: t.label, scopes: t.scopes, createdAt: t.createdAt, expiresAt: t.expiresAt, lastUsedAt: t.lastUsedAt, revokedAt: t.revokedAt, prefix: t.prefix })) });
      }
      if (path.startsWith("/api/auth/tokens/") && request.method === "DELETE") {
        const auth = await requireScope("dashboard:write");
        if (!auth) return;
        const id = decodeURIComponent(path.split("/").pop() || "");
        await revokeToken(id);
        await repository.createAuditEvent({
          workspaceId: auth.workspaceId,
          runId: null,
          eventType: "auth.token.revoked",
          severity: "warning",
          message: `Token ${id} revoked.`,
          metadata: { tokenId: id, requester: auth.tokenId },
        });
        return sendLogged(200, { ok: true });
      }

      // -----------------------------------------------------------------
      // Miro webhook ingestion (HMAC + dedupe via unique(source, external_id)).
      // -----------------------------------------------------------------
      if (path === "/api/webhooks/miro" && request.method === "POST") {
        const auth = await requireScope("webhooks:write");
        if (!auth) return;
        const raw = readBody(request, maxBodyBytes);
        let body = "";
        try { body = await raw; } catch (err) {
          if (err instanceof ResponseError) return sendLogged(err.status, { error: err.message });
          return sendLogged(500, { error: "Internal server error" });
        }
        const sig = request.headers["x-miro-signature"]?.toString() || "";
        const expected = require("node:crypto").createHmac("sha256", process.env.MIRO_WEBHOOK_SECRET || "dev-webhook-secret")
          .update(body).digest("hex");
        if (!sig || sig !== expected) {
          return sendLogged(401, { error: "Invalid webhook signature." });
        }
        let payload: Record<string, unknown>;
        try { payload = JSON.parse(body); } catch { return sendLogged(400, { error: "Invalid JSON." }); }
        const externalId = String((payload as { id?: unknown }).id ?? `${Date.now()}-${Math.random()}`);
        const workspaceId = String((payload as { workspaceId?: unknown }).workspaceId ?? auth.workspaceId);
        const result = await repository.recordWebhookDelivery({ source: "miro", externalId, workspaceId, payload });
        await repository.createAuditEvent({
          workspaceId,
          runId: null,
          eventType: result.inserted ? "webhook.received" : "webhook.duplicate",
          severity: "info",
          message: result.inserted ? `Webhook ${externalId} accepted.` : `Webhook ${externalId} deduplicated.`,
          metadata: { externalId, source: "miro" },
        });
        incWebhookDelivery(result.inserted ? "received" : "duplicate");
        return sendLogged(result.inserted ? 202 : 200, { status: result.inserted ? "received" : "duplicate", externalId });
      }

      // -----------------------------------------------------------------
      // Prometheus /metrics (text format).
      // -----------------------------------------------------------------
      if (path === "/metrics" && request.method === "GET") {
        const httpLines: string[] = [];
        for (const [name, value] of metrics()) {
          httpLines.push(`${name} ${value}`);
        }
        response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
        response.end(httpLines.join("\n") + "\n");
        return;
      }

      const distPath = resolve("dist", path === "/" ? "index.html" : path.slice(1));
      if (existsSync(distPath)) {
        response.writeHead(200, { "content-type": mimeTypes[extname(distPath)] || "application/octet-stream" });
        createReadStream(distPath).pipe(response);
        return;
      }
      return sendLogged(404, { error: "Not found" });
    } catch (error) {
      if (error instanceof ResponseError) return sendLogged(error.status, { error: error.message });
      // Log full error server-side; return a sanitized generic message to the client.
      console.error("[api] unhandled error:", error);
      return sendLogged(500, { error: "Internal server error" });
    }
  };
}

/**
 * Spin up the HTTP API. Tests pass `port: 0` to bind an ephemeral port.
 * The default path (`server/index.ts`) calls `listen()` itself; this is also
 * the boundary used by tests.
 */
export async function startServer(options: StartServerOptions = {}): Promise<Server> {
  const config = getConfig();
  const port = options.port ?? config.port;
  const corsOrigin = options.corsOrigin ?? config.corsOrigin;
  const maxBodyBytes = options.maxBodyBytes ?? 1_048_576; // 1 MiB
  const handler = buildHandler(corsOrigin, maxBodyBytes);
  return new Promise<Server>((resolve, reject) => {
    const server = createServer(handler);
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}
