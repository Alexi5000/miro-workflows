/**
 * tests/ui/app-routes.test.tsx — Mounts the App component in jsdom and
 * asserts each routed view renders successfully.
 *
 * Strategy: stub `global.fetch` with a JSON fixture that matches the
 * endpoints the App calls, then navigate by changing `window.location.hash`.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { App } from "../../src/App";

interface FetchFixture {
  status?: number;
  body: unknown;
}

const SUMMARY = {
  totals: { workspaces: 1, boards: 2, templates: 3, runs: 7, completedRuns: 7, createdItems: 28 },
  integration: { mode: "demo", status: "Demo mode - no Miro token required", hasAccessToken: false },
  recentRuns: [],
  boards: [
    { id: "board-a", name: "Sprint 23", status: "active", lastSyncedAt: "2026-07-01T00:00:00Z" },
    { id: "board-b", name: "Architecture Review", status: "draft", lastSyncedAt: "2026-07-02T00:00:00Z" },
  ],
  templates: [
    { id: "tpl-1", slug: "prd-to-board", name: "PRD to Board", steps: [{ id: "s1", name: "Frame" }] },
  ],
};

const TEMPLATES = { data: [{ id: "tpl-1", slug: "prd-to-board", name: "PRD to Board", category: "Demo", description: "x", outcome: "y", defaultBoardId: "board-a", estimatedMinutes: 10, status: "active", steps: [], createdAt: "2026-07-01", updatedAt: "2026-07-01" }] };
const BOARDS = { data: SUMMARY.boards.map((b) => ({ ...b, description: "", viewLink: "", workspaceId: "ws-demo", providerBoardId: b.id, createdAt: "2026-07-01" })) };
const RUNS = { data: [] };
const AUDIT = { data: [] };
const WORKSPACES = { data: [{ id: "ws-demo", name: "Product Studio", slug: "product-studio", provider: "miro", mode: "demo", status: "connected", createdAt: "2026-07-01", updatedAt: "2026-07-01" }], credentials: [] };
const BOARD_ITEMS = { data: [{ id: "item-1", itemType: "sticky_note", title: "Hello", runId: "run-1", boardId: "board-a", providerItemId: "p1", payload: {}, createdAt: "2026-07-01" }], board: BOARDS.data[0] };
const DEVICE_CODE = { userCode: "ABCD-EFGH", verificationUri: "https://miro.com/oauth/device", expiresIn: 600 };

function jsonResponse(fixture: FetchFixture, status = 200) {
  return new Response(JSON.stringify(fixture.body), { status, headers: { "content-type": "application/json" } });
}

function setupFetch() {
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/api/health")) return jsonResponse({ body: { status: "ok" } });
    if (url.endsWith("/api/summary")) return jsonResponse({ body: SUMMARY });
    if (url.endsWith("/api/templates")) return jsonResponse({ body: TEMPLATES });
    if (url.endsWith("/api/boards")) return jsonResponse({ body: BOARDS });
    if (url.endsWith("/api/runs")) return jsonResponse({ body: RUNS });
    if (url.endsWith("/api/audit-events")) return jsonResponse({ body: AUDIT });
    if (url.endsWith("/api/workspaces")) return jsonResponse({ body: WORKSPACES });
    if (url.includes("/api/boards/") && url.endsWith("/items")) return jsonResponse({ body: BOARD_ITEMS });
    if (url.includes("/oauth/device-code")) return jsonResponse({ body: DEVICE_CODE });
    if (url.endsWith("/api/credentials") || url.match(/\/api\/credentials\//)) return jsonResponse({ body: { ok: true } });
    return jsonResponse({ body: {} });
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

function setHash(hash: string) {
  window.location.hash = hash;
}

describe("App routing — UI surface", () => {
  beforeEach(() => {
    window.location.hash = "";
    setupFetch();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the dashboard view at /dashboard", async () => {
    setHash("#/dashboard");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("view-dashboard")).toBeInTheDocument());
    expect(screen.getByTestId("sidebar-link-dashboard")).toHaveClass("active");
  });

  it("renders the workspaces view at /workspaces", async () => {
    setHash("#/workspaces");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("view-workspaces")).toBeInTheDocument());
    expect(screen.getByTestId("workspace-list")).toBeInTheDocument();
  });

  it("renders the boards list at /boards", async () => {
    setHash("#/boards");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("view-boards")).toBeInTheDocument());
    expect(screen.getByTestId("board-list")).toBeInTheDocument();
  });

  it("renders a board detail at /boards/:id", async () => {
    setHash("#/boards/board-a");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("view-board-detail")).toBeInTheDocument());
    expect(await screen.findByTestId("board-artifacts")).toBeInTheDocument();
  });

  it("renders the credentials view with OAuth device flow at /credentials", async () => {
    setHash("#/credentials");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("view-credentials")).toBeInTheDocument());
    expect(screen.getByTestId("credential-list")).toBeInTheDocument();
    expect(screen.getByTestId("start-oauth-product-studio")).toBeInTheDocument();
  });
});
