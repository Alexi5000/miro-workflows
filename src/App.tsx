import { useEffect, useMemo, useState, Suspense } from "react";
import { Activity, ArrowRight, Boxes, CheckCircle2, Clock3, Database, GitBranch, KeyRound, LayoutDashboard, Link2, Play, RefreshCcw, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { api, type CredentialRecord } from "./api";
import type { AuditEvent, Board, DashboardSummary, RunDetail, WorkflowRun, WorkflowTemplate, Workspace } from "../shared/types";
import { matchRoute, navigate, useRoute } from "./lib/router";
import { ErrorBoundary } from "./components/ErrorBoundary";

type LoadState = "loading" | "ready" | "error";

const PATTERNS = [
  "/dashboard",
  "/workspaces",
  "/boards",
  "/boards/:id",
  "/credentials",
  "/",
] as const;

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof LayoutDashboard }) {
  return <article className="stat-card"><div><span>{label}</span><strong>{value}</strong><p>{detail}</p></div><Icon aria-hidden="true" /></article>;
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "success" | "warning" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function TemplateCard({ template, boards, onRun, isRunning }: { template: WorkflowTemplate; boards: Board[]; onRun: (slug: string, boardId: string) => void; isRunning: boolean }) {
  const board = boards.find((candidate) => candidate.id === template.defaultBoardId) || boards[0];
  return <article className="template-card">
    <div className="template-header"><Badge tone="success">{template.category}</Badge><span>{template.estimatedMinutes} min</span></div>
    <h3>{template.name}</h3>
    <p>{template.description}</p>
    <div className="steps-preview">{template.steps.slice(0, 4).map((step) => <span key={step.id}>{step.name}</span>)}</div>
    <button className="primary-button" onClick={() => board && onRun(template.slug, board.id)} disabled={!board || isRunning}><Play size={16} />{isRunning ? "Running" : "Run workflow"}</button>
  </article>;
}

function RunRow({ run, onSelect }: { run: WorkflowRun; onSelect: (runId: string) => void }) {
  return <button className="run-row" onClick={() => onSelect(run.id)}>
    <span><strong>{run.templateName}</strong><small>{run.boardName}</small></span>
    <span>{run.metrics.createdItems} items</span>
    <Badge tone={run.status === "completed" ? "success" : "warning"}>{run.status}</Badge>
    <ArrowRight size={16} />
  </button>;
}

function RunDetailPanel({ detail }: { detail: RunDetail | null }) {
  if (!detail) return <aside className="detail-panel empty"><Sparkles /><h3>No run selected</h3><p>Run a workflow or select a recent execution to inspect created artifacts, audit records, and execution metrics.</p></aside>;
  return <aside className="detail-panel">
    <div className="panel-title"><Badge tone="success">{detail.status}</Badge><h3>{detail.template.name}</h3></div>
    <p>{detail.summary}</p>
    <div className="metric-grid"><span>Steps<strong>{detail.metrics.completedSteps}/{detail.metrics.totalSteps}</strong></span><span>Items<strong>{detail.metrics.createdItems}</strong></span><span>Risk<strong>{detail.metrics.riskScore}/10</strong></span></div>
    <h4>Board artifacts</h4>
    <div className="artifact-list">{detail.items.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.itemType}</span></div>)}</div>
    <h4>Audit trail</h4>
    <div className="audit-list">{detail.auditEvents.map((event) => <div key={event.id}><span>{event.eventType}</span><p>{event.message}</p></div>)}</div>
  </aside>;
}

function Sidebar({ active }: { active: string }) {
  const items = [
    { pattern: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { pattern: "/workspaces", label: "Workspaces", icon: Workflow },
    { pattern: "/boards", label: "Boards", icon: Boxes },
    { pattern: "/credentials", label: "Credentials", icon: KeyRound },
  ];
  return (
    <nav data-testid="sidebar" className="sidebar">
      <div className="brand"><Workflow /><span>Miro Workflows</span></div>
      {items.map((item) => (
        <button
          key={item.pattern}
          type="button"
          className={`sidebar-link ${active === item.pattern ? "active" : ""}`}
          onClick={() => navigate(item.pattern)}
          data-testid={`sidebar-link-${item.pattern.replaceAll("/", "")}`}
        >
          <item.icon size={18} /> {item.label}
        </button>
      ))}
    </nav>
  );
}

// ---------- Dashboard view ----------

function DashboardView({ summary, templates, boards, runs, auditEvents, selectedRun, busyAction, onRun, onSelectRun, onSyncBoards }: {
  summary: DashboardSummary | null;
  templates: WorkflowTemplate[];
  boards: Board[];
  runs: WorkflowRun[];
  auditEvents: AuditEvent[];
  selectedRun: RunDetail | null;
  busyAction: string | null;
  onRun: (slug: string, boardId: string) => void;
  onSelectRun: (id: string) => void;
  onSyncBoards: () => void;
}) {
  const totals = summary?.totals;
  const health = useMemo(() => summary?.integration.hasAccessToken ? "Miro mode" : "Demo mode", [summary]);
  return (
    <section data-testid="view-dashboard" className="view">
      <section className="hero">
        <nav><Badge tone="success">Production-ready TypeScript buildout</Badge><button className="secondary-button" onClick={onSyncBoards} disabled={busyAction === "sync"}><RefreshCcw size={16} /> Sync boards</button></nav>
        <div className="hero-grid">
          <div>
            <h1>Turn visual collaboration into repeatable workflow operations.</h1>
            <p>Miro Workflows now combines a database-backed Node API, reusable workflow templates, audit trails, and a polished React dashboard while preserving the custom MCP server for board-level automation.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => templates[0] && boards[0] && onRun(templates[0].slug, boards[0].id)} disabled={!templates.length || !boards.length || Boolean(busyAction)}>
                <Play size={16} />Run flagship workflow
              </button>
              <a className="text-link" href="/api/health">View API health</a>
            </div>
          </div>
          <div className="system-card">
            <span>Integration status</span>
            <strong>{health}</strong>
            <p>{summary?.integration.status || "Loading integration status"}</p>
            <div><Database size={18} /> SQLite-backed operations</div>
            <div><ShieldCheck size={18} /> Secrets stay in environment variables</div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Templates" value={totals?.templates ?? "—"} detail="Reusable Miro workflow blueprints" icon={Boxes} />
        <StatCard label="Boards" value={totals?.boards ?? "—"} detail="Tracked collaboration workspaces" icon={LayoutDashboard} />
        <StatCard label="Runs" value={totals?.runs ?? "—"} detail="Recorded workflow executions" icon={Activity} />
        <StatCard label="Artifacts" value={totals?.createdItems ?? "—"} detail="Generated board items and records" icon={CheckCircle2} />
      </section>

      <section className="content-grid">
        <div className="main-column">
          <div className="section-heading"><span><GitBranch /> Workflow catalog</span><p>Run templates against seeded demo boards or a configured Miro connection.</p></div>
          <div className="template-grid">{(templates ?? []).map((template) => <TemplateCard key={template.id} template={template} boards={boards} onRun={onRun} isRunning={busyAction === template.slug} />)}</div>
          <div className="section-heading"><span><Clock3 /> Recent runs</span><p>Each execution records metrics, generated artifacts, and audit events.</p></div>
          <div className="runs-list">{(runs ?? []).length ? (runs ?? []).map((run) => <RunRow key={run.id} run={run} onSelect={onSelectRun} />) : <p className="muted">No workflow runs yet. Launch a template to populate this area.</p>}</div>
        </div>
        <RunDetailPanel detail={selectedRun} />
      </section>

      <section className="audit-section">
        <div className="section-heading"><span><ShieldCheck /> Operational audit</span><p>Recent automation and synchronization events are persisted for review.</p></div>
        <div className="audit-table">{(auditEvents ?? []).map((event) => <div key={event.id}><strong>{event.eventType}</strong><span>{event.severity}</span><p>{event.message}</p></div>)}</div>
      </section>
    </section>
  );
}

// ---------- Workspaces view ----------

function WorkspacesView({ workspaces, credentials }: { workspaces: Workspace[]; credentials: CredentialRecord[] }) {
  return (
    <section data-testid="view-workspaces" className="view">
      <h2>Workspaces</h2>
      <p>Each Miro workspace gets one row of credential metadata. Demo mode ships one seeded workspace; live mode expands as the OAuth device-flow completes.</p>
      <div className="workspace-grid" data-testid="workspace-list">
        {workspaces.map((workspace) => {
          const creds = credentials.filter((c) => c.workspaceId === workspace.id);
          return (
            <article key={workspace.id} className="workspace-card" data-testid={`workspace-${workspace.slug}`}>
              <header><Badge tone={workspace.mode === "miro" ? "success" : "neutral"}>{`${workspace.provider}/${workspace.mode}`}</Badge><h3>{workspace.name}</h3></header>
              <dl>
                <div><dt>Workspace ID</dt><dd><code>{workspace.id}</code></dd></div>
                <div><dt>Status</dt><dd>{workspace.status}</dd></div>
                <div><dt>Credentials</dt><dd>{creds.length} configured</dd></div>
              </dl>
              <footer><button className="primary-button" onClick={() => navigate("/credentials")}>Manage credentials</button></footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Boards views ----------

interface BoardItemsResponse { data: Array<{ id: string; itemType: string; title: string }>; board: Board }

function BoardsListView({ boards, onSelect }: { boards: Board[]; onSelect: (id: string) => void }) {
  return (
    <section data-testid="view-boards" className="view">
      <h2>Boards</h2>
      <p>Click a board to inspect the items produced by recent runs.</p>
      <ul className="board-list" data-testid="board-list">
        {boards.map((board) => (
          <li key={board.id}>
            <button type="button" onClick={() => onSelect(board.id)} data-testid={`board-${board.id}`}>
              <span><strong>{board.name}</strong><small>{board.status}</small></span>
              <span>{board.workspaceId}</span>
              <ArrowRight size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BoardDetailView({ boardId }: { boardId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<BoardItemsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.boardItems(boardId);
        if (!cancelled) { setData(res); setState("ready"); }
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setState("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [boardId]);
  return (
    <section data-testid="view-board-detail" className="view">
      <button className="text-link" type="button" onClick={() => navigate("/boards")}>← All boards</button>
      <h2>{data?.board?.name ?? `Board ${boardId}`}</h2>
      <p>Per-board artifact viewer. Every run that targeted this board contributed the items below.</p>
      {state === "loading" && <div className="loading">Loading board artifacts…</div>}
      {state === "error" && <div className="error-banner">{error}</div>}
      {state === "ready" && (
        <ul className="artifact-list" data-testid="board-artifacts">
          {(data?.data ?? []).map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.itemType}</span></li>)}
          {(data?.data ?? []).length === 0 && <p className="muted">No artifacts yet — run a workflow against this board.</p>}
        </ul>
      )}
    </section>
  );
}

// ---------- Credentials view (OAuth device flow + manual entry) ----------

function CredentialsView({ workspaces, credentials, onChange }: { workspaces: Workspace[]; credentials: CredentialRecord[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceFlow, setDeviceFlow] = useState<{ workspaceId: string; userCode: string; verificationUri: string } | null>(null);

  async function startDeviceFlow(workspaceId: string) {
    try {
      setBusy(workspaceId);
      setError(null);
      const res = await api.startOAuthDeviceFlow(workspaceId);
      setDeviceFlow({ workspaceId, userCode: res.userCode, verificationUri: res.verificationUri });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function completeDeviceFlow(workspaceId: string) {
    try {
      setBusy(`complete-${workspaceId}`);
      setError(null);
      await api.upsertCredential({
        workspaceId,
        credentialLabel: `OAuth device-flow ${new Date().toISOString().slice(0, 16)}`,
        scopes: ["board:read", "board:write"],
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
      setDeviceFlow(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    try {
      setBusy(`revoke-${id}`);
      await api.deleteCredential(id);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section data-testid="view-credentials" className="view">
      <h2>Credentials</h2>
      <p>Each workspace holds credential metadata only — tokens never reach the database. Use the OAuth device flow to wire a live Miro account, or attach a placeholder credential for demo mode.</p>
      {error && <div className="error-banner" data-testid="credentials-error">{error}</div>}
      <ul className="credential-list" data-testid="credential-list">
        {credentials.map((credential) => (
          <li key={credential.id} className="credential-row" data-testid={`credential-${credential.id}`}>
            <div>
              <strong>{credential.credentialLabel}</strong>
              <Badge tone="success">{credential.status}</Badge>
              {credential.fromOAuthDeviceFlow && <Badge tone="warning">device-flow</Badge>}
              <small>scopes: {credential.scopes.join(", ")}</small>
              {credential.expiresAt && <small>expires: {new Date(credential.expiresAt).toLocaleString()}</small>}
            </div>
            <button type="button" onClick={() => revoke(credential.id)} disabled={busy === `revoke-${credential.id}`}>Revoke</button>
          </li>
        ))}
        {credentials.length === 0 && <li className="muted">No credentials yet. Start the OAuth device flow below.</li>}
      </ul>

      <section className="oauth-section">
        <h3>OAuth device flow</h3>
        <p>Miro's OAuth 2.0 device authorization grant returns a short user-code. Open the verification URL, paste the code, then press Complete.</p>
        <div className="oauth-controls">
          {workspaces.map((workspace) => (
            <button key={workspace.id} type="button" onClick={() => startDeviceFlow(workspace.id)} disabled={busy === workspace.id} data-testid={`start-oauth-${workspace.slug}`}>
              <KeyRound size={14} /> Start flow for {workspace.name}
            </button>
          ))}
        </div>
        {deviceFlow && (
          <div className="device-flow" data-testid="device-flow">
            <p>User code: <code>{deviceFlow.userCode}</code></p>
            <p>Verification URL: <a href={deviceFlow.verificationUri} data-testid="device-flow-url">{deviceFlow.verificationUri}</a></p>
            <button type="button" onClick={() => completeDeviceFlow(deviceFlow.workspaceId)} disabled={busy === `complete-${deviceFlow.workspaceId}`} data-testid="complete-device-flow">
              <Link2 size={14} /> Complete device flow
            </button>
          </div>
        )}
      </section>
    </section>
  );
}

// ---------- App shell ----------

export function App() {
  const route = useRoute([...PATTERNS]);

  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True after the first dashboard load completes. Gates the global loading
  // skeleton so subsequent refreshes don't blank the UI.
  const [initialLoaded, setInitialLoaded] = useState(false);

  async function load(includeWorkspaces = false) {
    try {
      if (!initialLoaded) setState("loading");
      const [s, t, b, r, a] = await Promise.all([api.summary(), api.templates(), api.boards(), api.runs(), api.auditEvents()]);
      setSummary(s);
      setTemplates(t.data);
      setBoards(b.data);
      setRuns(r.data);
      setAuditEvents(a.data);
      if (includeWorkspaces) await loadWorkspaces();
      setState("ready");
      setInitialLoaded(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  async function loadWorkspaces() {
    try {
      const res = await api.workspaces();
      setWorkspaces(res.data);
      setCredentials(res.credentials.map((c) => ({ ...c, fromOAuthDeviceFlow: c.fromOAuthDeviceFlow ?? false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Bootstrap once on mount.
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // React to route changes after the initial load.
  useEffect(() => {
    // navigate from / to /dashboard for clarity
    if (route.pattern === "/" && typeof window !== "undefined") {
      navigate("/dashboard");
      return;
    }
    if (route.pattern === "/workspaces" || route.pattern === "/credentials") {
      void loadWorkspaces();
    }
    if (route.pattern === "/boards/:id" && matched.params.id) {
      // BoardDetailView fetches its own data; nothing to preload.
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [route.pattern]);

  async function runWorkflow(templateSlug: string, boardId: string) {
    try {
      setBusyAction(templateSlug);
      const detail = await api.startRun(templateSlug, boardId);
      setSelectedRun(detail);
      // Re-fetch the dashboard metadata but KEEP the freshly-returned run detail
      // by setting it AFTER the load() that we don't want to clobber it.
      await load();
      setSelectedRun(detail);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusyAction(null); }
  }

  async function syncBoards() {
    try { setBusyAction("sync"); await api.syncBoards(); await load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusyAction(null); }
  }

  async function selectRun(runId: string) {
    try { setSelectedRun(await api.runDetail(runId)); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  const matched = matchRoute([...PATTERNS], route.path);

  return (
    <div className="app-shell">
      <Sidebar active={matched.pattern ?? "/dashboard"} />
      <main className="app-main" data-testid="app-main">
        {!initialLoaded && state === "loading" && <div className="loading" data-testid="initial-loading">Loading workflow command center…</div>}
        {error && <div className="error-banner" data-testid="global-error">{error}</div>}
        {matched.pattern === "/dashboard" && (
          <ErrorBoundary boundary="dashboard">
            <Suspense fallback={<div className="loading">Loading dashboard…</div>}>
              <DashboardView
                summary={summary} templates={templates} boards={boards} runs={runs}
                auditEvents={auditEvents} selectedRun={selectedRun} busyAction={busyAction}
                onRun={runWorkflow} onSelectRun={selectRun} onSyncBoards={syncBoards}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {matched.pattern === "/workspaces" && (
          <ErrorBoundary boundary="workspaces">
            <Suspense fallback={<div className="loading">Loading workspaces…</div>}>
              <WorkspacesView workspaces={workspaces} credentials={credentials} />
            </Suspense>
          </ErrorBoundary>
        )}
        {matched.pattern === "/boards" && (
          <ErrorBoundary boundary="boards">
            <Suspense fallback={<div className="loading">Loading boards…</div>}>
              <BoardsListView boards={boards} onSelect={(id) => navigate(`/boards/${id}`)} />
            </Suspense>
          </ErrorBoundary>
        )}
        {matched.pattern === "/boards/:id" && (
          <ErrorBoundary boundary="board-detail">
            <Suspense fallback={<div className="loading">Loading board…</div>}>
              <BoardDetailView boardId={matched.params.id ?? ""} />
            </Suspense>
          </ErrorBoundary>
        )}
        {matched.pattern === "/credentials" && (
          <ErrorBoundary boundary="credentials">
            <Suspense fallback={<div className="loading">Loading credentials…</div>}>
              <CredentialsView workspaces={workspaces} credentials={credentials} onChange={loadWorkspaces} />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
