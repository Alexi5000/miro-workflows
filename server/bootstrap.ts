import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, resolve } from "node:path";
import { getConfig } from "./config.js";
import { repository } from "./db/database.js";
import { ResponseError, startWorkflowRun, syncBoards } from "./services/workflowService.js";

export interface StartServerOptions {
  port?: number;
  corsOrigin?: string;
}

async function readBody(request: IncomingMessage): Promise<string> {
  return new Promise<string>((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
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

function buildHandler(corsOrigin: string) {
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
        const raw = JSON.parse((await readBody(request)) || "{}");
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

      const distPath = resolve("dist", path === "/" ? "index.html" : path.slice(1));
      if (existsSync(distPath)) {
        response.writeHead(200, { "content-type": mimeTypes[extname(distPath)] || "application/octet-stream" });
        createReadStream(distPath).pipe(response);
        return;
      }
      return send(response, 404, { error: "Not found" }, corsOrigin);
    } catch (error) {
      if (error instanceof ResponseError) return send(response, error.status, { error: error.message }, corsOrigin);
      return send(response, 500, { error: error instanceof Error ? error.message : String(error) }, corsOrigin);
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
  const handler = buildHandler(corsOrigin);
  return new Promise<Server>((resolve) => {
    const server = createServer(handler);
    server.listen(port, () => resolve(server));
  });
}
