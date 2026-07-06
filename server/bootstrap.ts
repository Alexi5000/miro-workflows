import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, resolve } from "node:path";
import { getConfig } from "./config.js";
import { repository } from "./db/database.js";
import { ResponseError, startWorkflowRun, syncBoards } from "./services/workflowService.js";

export interface StartServerOptions {
  port?: number;
  corsOrigin?: string;
  /** Max request body size in bytes. Default 1 MiB. */
  maxBodyBytes?: number;
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
    "access-control-allow-headers": "content-type",
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
    if (!request.url) return send(response, 400, { error: "Missing URL" }, corsOrigin);
    if (request.method === "OPTIONS") {
      response.writeHead(204, jsonHeaders);
      response.end();
      return;
    }
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const path = url.pathname;

    try {
      if (path === "/api/health") {
        return send(
          response,
          200,
          { status: "ok", mode: config.providerMode, databasePath: config.databasePath, timestamp: new Date().toISOString() },
          corsOrigin,
        );
      }
      if (path === "/api/summary") return send(response, 200, repository.getSummary(), corsOrigin);
      if (path === "/api/workspaces")
        return send(response, 200, { data: repository.listWorkspaces(), credentials: repository.listCredentials() }, corsOrigin);
      if (path === "/api/boards") return send(response, 200, { data: repository.listBoards() }, corsOrigin);
      if (path === "/api/templates") return send(response, 200, { data: repository.listTemplates() }, corsOrigin);
      if (path.startsWith("/api/templates/")) {
        const template = repository.getTemplateBySlug(decodeURIComponent(path.split("/").pop() || ""));
        return send(response, template ? 200 : 404, template || { error: "Template not found" }, corsOrigin);
      }
      if (path === "/api/runs" && request.method === "GET")
        return send(response, 200, { data: repository.listRuns(Number(url.searchParams.get("limit") || 25)) }, corsOrigin);
      if (path === "/api/runs" && request.method === "POST") {
        const raw = parseBody(await readBody(request, maxBodyBytes)) as Record<string, unknown>;
        const started = await startWorkflowRun(raw);
        return send(response, 201, started, corsOrigin);
      }
      if (path.startsWith("/api/runs/")) {
        const run = repository.getRun(decodeURIComponent(path.split("/").pop() || ""));
        return send(response, run ? 200 : 404, run || { error: "Run not found" }, corsOrigin);
      }
      if (path === "/api/audit-events")
        return send(
          response,
          200,
          { data: repository.listAuditEvents({ limit: Number(url.searchParams.get("limit") || 50) }) },
          corsOrigin,
        );
      if (path === "/api/sync/boards" && request.method === "POST")
        return send(response, 200, { data: await syncBoards() }, corsOrigin);

      if (path.startsWith("/api/boards/") && path.endsWith("/items") && request.method === "GET") {
        const boardId = decodeURIComponent(path.split("/")[3] || "");
        const board = repository.getBoard(boardId);
        if (!board) return send(response, 404, { error: "Board not found" }, corsOrigin);
        const allRuns = repository.listRuns(50);
        const matching = allRuns.filter((r) => r.boardId === boardId);
        const items = matching.flatMap((r) => repository.listBoardItems(r.id));
        return send(response, 200, { data: items, board }, corsOrigin);
      }

      if (path === "/api/credentials" && request.method === "POST") {
        const raw = parseBody(await readBody(request, maxBodyBytes)) as Record<string, unknown>;
        const wsId = String(raw.workspaceId || "");
        const label = String(raw.credentialLabel || "").trim() || "Miro OAuth credential";
        const scopes = Array.isArray(raw.scopes) ? raw.scopes.map((s: unknown) => String(s)) : ["board:read", "board:write"];
        const expiresAt = typeof raw.expiresAt === "string" ? raw.expiresAt : new Date(Date.now() + 3600_000).toISOString();
        if (!wsId) return send(response, 400, { error: "workspaceId required" }, corsOrigin);
        const workspace = repository.listWorkspaces().find((w) => w.id === wsId);
        if (!workspace) return send(response, 404, { error: "Workspace not found" }, corsOrigin);
        const record = {
          id: `cred-${crypto.randomUUID()}`,
          workspaceId: wsId,
          provider: "miro" as const,
          credentialLabel: label,
          scopes,
          expiresAt,
          status: "connected" as const,
          fromOAuthDeviceFlow: true,
        };
        await repository.upsertCredential(record);
        await repository.createAuditEvent({
          workspaceId: wsId,
          runId: null,
          eventType: "credential.added",
          severity: "info",
          message: `Credential '${label}' added for workspace ${workspace.name}.`,
          metadata: { credentialLabel: label, scopes },
        });
        return send(response, 201, { credential: record, deviceFlow: null }, corsOrigin);
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
        return send(response, 200, { ok: true }, corsOrigin);
      }

      if (path.match(/^\/api\/workspaces\/[^/]+\/oauth\/device-code$/) && request.method === "POST") {
        const workspaceId = decodeURIComponent(path.split("/")[3] || "");
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
        return send(response, 200, {
          userCode,
          verificationUri: "https://miro.com/oauth/device",
          expiresIn: 600,
        }, corsOrigin);
      }

      const distPath = resolve("dist", path === "/" ? "index.html" : path.slice(1));
      if (existsSync(distPath)) {
        response.writeHead(200, { "content-type": mimeTypes[extname(distPath)] || "application/octet-stream" });
        createReadStream(distPath).pipe(response);
        return;
      }
      return send(response, 404, { error: "Not found" }, corsOrigin);
    } catch (error) {
      if (error instanceof ResponseError) return send(response, error.status, { error: error.message }, corsOrigin);
      // Log full error server-side; return a sanitized generic message to the client.
      console.error("[api] unhandled error:", error);
      return send(response, 500, { error: "Internal server error" }, corsOrigin);
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
