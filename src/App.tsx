import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Boxes, CheckCircle2, Clock3, Database, GitBranch, LayoutDashboard, Play, RefreshCcw, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { api } from "./api";
import type { AuditEvent, Board, DashboardSummary, RunDetail, WorkflowRun, WorkflowTemplate } from "../shared/types";

type LoadState = "loading" | "ready" | "error";

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

export function App() {
  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setState("loading");
      const [summaryData, templateData, boardData, runData, auditData] = await Promise.all([api.summary(), api.templates(), api.boards(), api.runs(), api.auditEvents()]);
      setSummary(summaryData);
      setTemplates(templateData.data);
      setBoards(boardData.data);
      setRuns(runData.data);
      setAuditEvents(auditData.data);
      setState("ready");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function runWorkflow(templateSlug: string, boardId: string) {
    try {
      setBusyAction(templateSlug);
      const detail = await api.startRun(templateSlug, boardId);
      setSelectedRun(detail);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusyAction(null); }
  }

  async function syncBoards() {
    try { setBusyAction("sync"); await api.syncBoards(); await load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusyAction(null); }
  }

  async function selectRun(runId: string) {
    try { setSelectedRun(await api.runDetail(runId)); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  const totals = summary?.totals;
  const health = useMemo(() => summary?.integration.hasAccessToken ? "Miro mode" : "Demo mode", [summary]);

  return <main>
    <section className="hero">
      <nav><div className="brand"><Workflow /><span>Miro Workflows</span></div><button className="secondary-button" onClick={syncBoards} disabled={busyAction === "sync"}><RefreshCcw size={16} /> Sync boards</button></nav>
      <div className="hero-grid"><div><Badge tone="success">Production-ready TypeScript buildout</Badge><h1>Turn visual collaboration into repeatable workflow operations.</h1><p>Miro Workflows now combines a database-backed Node API, reusable workflow templates, audit trails, and a polished React dashboard while preserving the custom MCP server for board-level automation.</p><div className="hero-actions"><button className="primary-button" onClick={() => templates[0] && boards[0] && runWorkflow(templates[0].slug, boards[0].id)} disabled={!templates.length || !boards.length || Boolean(busyAction)}><Play size={16} />Run flagship workflow</button><a className="text-link" href="/api/health">View API health</a></div></div><div className="system-card"><span>Integration status</span><strong>{health}</strong><p>{summary?.integration.status || "Loading integration status"}</p><div><Database size={18} /> SQLite-backed operations</div><div><ShieldCheck size={18} /> Secrets stay in environment variables</div></div></div>
    </section>

    {error && <div className="error-banner">{error}</div>}
    {state === "loading" && <div className="loading">Loading workflow command center…</div>}

    <section className="stats-grid">
      <StatCard label="Templates" value={totals?.templates ?? "—"} detail="Reusable Miro workflow blueprints" icon={Boxes} />
      <StatCard label="Boards" value={totals?.boards ?? "—"} detail="Tracked collaboration workspaces" icon={LayoutDashboard} />
      <StatCard label="Runs" value={totals?.runs ?? "—"} detail="Recorded workflow executions" icon={Activity} />
      <StatCard label="Artifacts" value={totals?.createdItems ?? "—"} detail="Generated board items and records" icon={CheckCircle2} />
    </section>

    <section className="content-grid">
      <div className="main-column">
        <div className="section-heading"><span><GitBranch /> Workflow catalog</span><p>Run templates against seeded demo boards or a configured Miro connection.</p></div>
        <div className="template-grid">{templates.map((template) => <TemplateCard key={template.id} template={template} boards={boards} onRun={runWorkflow} isRunning={busyAction === template.slug} />)}</div>
        <div className="section-heading"><span><Clock3 /> Recent runs</span><p>Each execution records metrics, generated artifacts, and audit events.</p></div>
        <div className="runs-list">{runs.length ? runs.map((run) => <RunRow key={run.id} run={run} onSelect={selectRun} />) : <p className="muted">No workflow runs yet. Launch a template to populate this area.</p>}</div>
      </div>
      <RunDetailPanel detail={selectedRun} />
    </section>

    <section className="audit-section"><div className="section-heading"><span><ShieldCheck /> Operational audit</span><p>Recent automation and synchronization events are persisted for review.</p></div><div className="audit-table">{auditEvents.map((event) => <div key={event.id}><strong>{event.eventType}</strong><span>{event.severity}</span><p>{event.message}</p></div>)}</div></section>
  </main>;
}
