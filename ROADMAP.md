# Roadmap

> Last revised: 2026-07-06 · Branch: `feature/fde-foundation-pr` · 22 commits ahead of `master`.

This is the public forward-looking plan. Internal milestones and current
sprint details live in `/docs/internal/` (not in foundation).

---

## v1.0 — FDE foundation (DONE)

**Tag:** `v1.0.0-fde-foundation`
**Branch:** `feature/fde-foundation-pr` (this PR)

- 12 FDE pillars implemented and verified.
- 20 MCP tools, 16 HTTP endpoints, 4 UI views, 87 tests, 3 Docker images.
- All six ADRs accepted; `ADR-0006` documents the three-agent harness.

---

## v1.1 — Production auth + Postgres pivot (planned: 4 weeks)

**Tag:** `v1.1.0`

Goals:

1. Bearer-token auth wall on every write endpoint; CSRF on state changes.
2. Real OAuth device-flow with token exchange + refresh + encrypted storage.
3. Postgres (Drizzle ORM) with `sql.js` retained as a dev-only fallback.
4. Structured logs (pino) + OpenTelemetry traces + Prometheus `/metrics`.

Acceptance:

- Migration run-book committed.
- `pnpm run ci` green; coverage ≥ 80%.
- Auth wall E2E test gate in CI.
- Helm chart + GHCR signed images + OIDC publisher.

Migration notes:

- New `v1.0 → v1.1` ADR.
- Backward-compat: API routes unchanged at the path level; only auth middleware added.

---

## v1.2 — Real Miro REST + webhooks

**Tag:** `v1.2.0`

Goals:

1. Replace `MiroRestProvider.syncBoard` with full board + item CRUD.
2. `POST /api/webhooks/miro` with HMAC verification + dedupe.
3. Cursor pagination; `Retry-After` parsed as numeric OR HTTP-date.
4. Per-workspace rate-limit; OpenTelemetry spans for every Miro request.

Acceptance:

- Webhook signed-replay test in CI.
- Load test: 100 boards/min, p95 write < 800 ms.

---

## v1.3 — Dashboard rewrite

**Tag:** `v1.3.0`

Goals:

1. Replace hash router with react-router v7 (data + loaders).
2. Suspense + ErrorBoundary everywhere.
3. Playwright e2e + visual snapshots.
4. Accessibility audit (axe, 0 violations).

---

## v1.4 — Multi-tenant + regions

**Tag:** `v1.4.0`

Goals:

1. Per-workspace DB isolation.
2. Read replicas + per-region failover.
3. Backups + point-in-time recovery.
4. Customer-facing status page.

---

## v1.5 — SDK + ecosystem

**Tag:** `v1.5.0`

Goals:

1. Official TS SDK (`@miro-workflows/sdk`) with zod re-exports.
2. Python + Go SDKs.
3. Public templates marketplace on the dashboard.
4. Webhook delivery UI + retries.

---

## Backlog

- Multi-language board content (i18n).
- Figma → Miro board import.
- Realtime board sync via WebSockets.
- AI-assisted layout generation (uses the existing three-agent harness).
- Granular audit-event search.

---

## Won't do (yet)

- Drawing freehand annotations (out of scope for MCP REST API).
- Realtime presence (use Miro's own presence; we don't replicate).
- Authorization model beyond `workspace_id` (no fine-grained RBAC until v2.x).
