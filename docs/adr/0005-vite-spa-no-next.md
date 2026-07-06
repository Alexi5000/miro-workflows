# ADR-0005: React + Vite single-page dashboard, not Next.js

- Status: Accepted
- Date: 2026-07-05

## Context

The Miro Workflows dashboard is an internal-operations UI:

- Fetches a handful of small JSON endpoints.
- Shows run history, audit events, and template catalog.
- Does **not** need SEO, server components, ISR, or edge rendering.

A Next.js stack would import a build router we don't use, bloat the install,
and require us to maintain `app/` conventions on top of an already rich
`src/` tree.

## Decision

Use **React 18 + Vite + plain CSS**:

- Entry: `index.html`, `src/main.tsx`, `src/App.tsx`.
- API client: `src/api.ts` with a 27-line `request<T>()` helper.
- Single SPA shell hosted from `dist/` via `nginx:alpine`.
- Dev server proxies `/api` to `127.0.0.1:8787` (`vite.config.ts`).
- Styling: handwritten CSS in `src/styles.css` (no Tailwind), dark-mode tokens.

## Consequences

- ✅ `pnpm install` is ~150 MB smaller than with Next.js.
- ✅ Build is `vite build` only — under 5 seconds.
- ✅ No "use client" boundaries; the whole tree is client.
- ⚠️ No SSR; the dashboard requires a live API or the demo database.
- ⚠️ Routing is single-page only; deep-link to a run is via URL hash.

## Alternatives considered

- **Next.js (app router)**: rejected — operational dashboards don't benefit
  from server components, and the SSR build pipeline is heavier than the API.
- **Remix**: rejected — similar reasoning; framework-of-the-week risk.
- **SvelteKit**: rejected — would impose a second mental model on the team.
