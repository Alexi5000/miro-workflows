import { createServer } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, resolve } from "node:path";
import { getConfig } from "./config.js";
import { repository } from "./db/database.js";
import { ResponseError, startWorkflowRun, syncBoards } from "./services/workflowService.js";

repository.migrate();
const config = getConfig();

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": config.corsOrigin, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
const mimeTypes: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

function readBody(request: import("node:http").IncomingMessage) {
  return new Promise<string>((resolveBody, reject) => {
    let body = "";
    request.on("data", chunk => body += chunk);
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

function send(response: import("node:http").ServerResponse, status: number, data: unknown) {
  response.writeHead(status, jsonHeaders);
  response.end(JSON.stringify(data, null, 2));
}

const server = createServer(async (request, response) => {
  if (!request.url) return send(response, 400, { error: "Missing URL" });
  if (request.method === "OPTIONS") { response.writeHead(204, jsonHeaders); response.end(); return; }
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const path = url.pathname;

  try {
    if (path === "/api/health") return send(response, 200, { status: "ok", mode: config.providerMode, databasePath: config.databasePath, timestamp: new Date().toISOString() });
    if (path === "/api/summary") return send(response, 200, repository.getSummary());
    if (path === "/api/workspaces") return send(response, 200, { data: repository.listWorkspaces(), credentials: repository.listCredentials() });
    if (path === "/api/boards") return send(response, 200, { data: repository.listBoards() });
    if (path === "/api/templates") return send(response, 200, { data: repository.listTemplates() });
    if (path.startsWith("/api/templates/")) { const template = repository.getTemplateBySlug(decodeURIComponent(path.split("/").pop() || "")); return send(response, template ? 200 : 404, template || { error: "Template not found" }); }
    if (path === "/api/runs" && request.method === "GET") return send(response, 200, { data: repository.listRuns(Number(url.searchParams.get("limit") || 25)) });
    if (path === "/api/runs" && request.method === "POST") return send(response, 201, await startWorkflowRun(JSON.parse(await readBody(request) || "{}")));
    if (path.startsWith("/api/runs/")) { const run = repository.getRun(decodeURIComponent(path.split("/").pop() || "")); return send(response, run ? 200 : 404, run || { error: "Run not found" }); }
    if (path === "/api/audit-events") return send(response, 200, { data: repository.listAuditEvents({ limit: Number(url.searchParams.get("limit") || 50) }) });
    if (path === "/api/sync/boards" && request.method === "POST") return send(response, 200, { data: await syncBoards() });

    const distPath = resolve("dist", path === "/" ? "index.html" : path.slice(1));
    if (existsSync(distPath)) {
      response.writeHead(200, { "content-type": mimeTypes[extname(distPath)] || "application/octet-stream" });
      createReadStream(distPath).pipe(response);
      return;
    }
    return send(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof ResponseError) return send(response, error.status, { error: error.message });
    return send(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(config.port, () => console.log(`Miro Workflows API running at http://localhost:${config.port}`));
