# ADR-0015: react-router v7 (data router) — replace hash router

- Status: Accepted
- Date: 2026-07-07

## Context

The foundation uses a 70-line hash router (`src/lib/router.ts`). It
covers the four views (dashboard / workspaces / boards / boards/:id /
credentials) but is missing:
- Data loaders (no `useLoaderData` / Suspense).
- Error boundaries per route.
- Code splitting (today the dashboard is a single bundle).
- Programmatic navigation from inside the data layer.

## Decision

Replace `src/lib/router.ts` with **`react-router` v7** (the data router)
and run a single dependency at the front-end.

### Boundaries

- One route per view in `src/routes/`. Each route exports a `loader`
  (data) + `Component` (render) + `ErrorBoundary` (failure UI).
- The data layer uses `useLoaderData` and the existing `src/api.ts`
  client. No new fetch abstraction.
- `AuthProvider` is mounted at the root and exposed via `useAuth()` to
  every route. The auth wall on the server side enforces scopes; the
  client only knows whether it has a token.
- The `X-Trace-Id` and `requestId` headers are propagated into every
  loader so the dashboard can correlate UI errors with the structured
  access log.

### Migration

- The `useRoute()` hook is replaced by `useLoaderData()` + `useParams()`.
- `<App />` becomes a thin shell that delegates to `<Outlet />`.
- The legacy `App.tsx` (single SPA) is preserved behind a feature flag
  for one release; v1.2 deletes it.

## Consequences

- ✅ Per-route `ErrorBoundary` surfaces failures without white-screening
  the dashboard.
- ✅ `Suspense` + `useTransition` give us optimistic UI on writes.
- ⚠️ Adds `react-router` (~12 KB gzipped) and `react-router-dom` (depre
  cated in v7 but still in tree). The single-package migration is in
  the v7 docs.
- ⚠️ We lose zero-config hash routing. The `http://localhost:5173/`
  redirect from `/` to `/dashboard` becomes a router-side redirect.

## Alternatives considered

- **Stay on the hash router + add Suspense manually**: rejected —
  reinventing the data router buys nothing and locks us in.
- **TanStack Router**: considered. Rejected for v1.1 — react-router is
  the lowest-friction path for a small team; we can swap later.
