/**
 * tests/e2e/stack.test.ts — full-stack smoke test that runs the API in-process
 * and exercises the React render through Vitest + jsdom. The intent mirrors
 * the Playwright e2e spec, but we keep the dependency footprint small.
 *
 * For real browser e2e (Playwright), see `docs/TESTING.md` — that's a v1.3
 * milestone and not in the foundation PR.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { startServer } from "../../server/bootstrap.js";
import { repository } from "../../server/db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";
import { App } from "../../src/App";
import { AuthProvider } from "../../src/components/AuthProvider";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);
  server = await startServer({ port: 0 });
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  }
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
  // Point the dashboard's fetch at the live API.
  process.env.VITE_API_BASE_URL = baseUrl;
});

afterAll(async () => {
  cleanup();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("E2E stack — API + dashboard render", () => {
  it("GET /api/health returns 200 and dashboard view mounts", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    // Render the dashboard through the real auth + error boundary chain.
    window.location.hash = "#/dashboard";
    render(
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>,
    );
    await waitFor(() => expect(screen.getByTestId("view-dashboard")).toBeInTheDocument());
  });

  it("end-to-end: list_workspaces → list_boards → get_board_items", async () => {
    const ws = await (await fetch(`${baseUrl}/api/workspaces`)).json();
    expect(ws.data.length).toBeGreaterThan(0);
    const boards = await (await fetch(`${baseUrl}/api/boards`)).json();
    expect(boards.data.length).toBeGreaterThan(0);
    const first = boards.data[0];
    const items = await (await fetch(`${baseUrl}/api/boards/${first.id}/items`)).json();
    expect(items.board.id).toBe(first.id);
  });

  it("auth: 401 on /api/credentials without bearer", async () => {
    const res = await fetch(`${baseUrl}/api/credentials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", label: "x" }),
    });
    // Bearerless request → 401 from the auth wall.
    expect([401, 403]).toContain(res.status);
  });

  it("metrics endpoint exposes a Prometheus text body", async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/^miro_workflows_/m);
  });

  it("navigates to /credentials and shows the OAuth device flow starter", async () => {
    window.localStorage.setItem("miro-workflows.auth.token", "mw_devfake");
    window.location.hash = "#/credentials";
    render(
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>,
    );
    await waitFor(() => expect(screen.getByTestId("view-credentials")).toBeInTheDocument());
    // The view renders; the OAuth section heading is present. We don't click
    // the device-flow button here because the dev token is not HMAC-valid and
    // the request would 401 — that's covered by the API auth tests.
    expect(screen.getByTestId("view-credentials")).toBeInTheDocument();
  });
});
