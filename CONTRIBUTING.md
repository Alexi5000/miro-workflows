# Contributing

Thanks for contributing to Miro Workflows!

## Workflow

1. **Fork** the repo and cut a feature branch from `master`.
2. **Read** `AGENTS.md` (procedural memory) and `.agents/skills/fde-pillar-review/SKILL.md` (12-pillar checklist).
3. **Branch name:** `feature/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`, or `test/<slug>`.
4. **Conventional commits** with a scope:
   `feat(contracts): typed versioned sprint contract`
   `fix(mcp): 429 retry honors Retry-After as HTTP-date`
   `docs(adr): record the five load-bearing architectural choices`
5. **Tests** — cover the new surface:
   - `pnpm test` for server/contracts/scripts/agents,
   - `pnpm run test:ui` for React jsdom render tests,
   - `cd miro-custom-mcp && pnpm test` for MCP tool + transport tests.
6. **Coverage** — `pnpm run coverage` must stay at thresholds (lines/functions/statements ≥ 80%, branches ≥ 65%).
7. **ADRs** — any load-bearing decision needs an `Nygard-template` ADR under `docs/adr/`.
8. **Pre-flight:**
   ```bash
   pnpm run ci        # typecheck + contracts + tests + smoke + validate
   pnpm run bench     # bench numbers; refresh docs/BENCHMARK.md if they drift
   docker compose -f docker-compose.yml config -q
   ```
9. **Open the PR** against `master`. At least one maintainer review + CI green.

## Coding standards

- **TypeScript strict ESM**. Never `any` in `shared/`. Use zod schemas for all IO.
- **HTTP responses**: `{ data: ... }` for collections, `{ ... }` for single resources, `{ error: "..." }` for failures.
- **Errors**: throw `ResponseError(status, message)` from `server/services/workflowService.ts`. Never raw `throw new Error()` in routes.
- **Audit events**: every state-changing operation writes via `repository.createAuditEvent`.
- **Demo mode is the default**. CI runs in demo mode. Set `MIRO_PROVIDER_MODE=miro` only when explicitly testing the live provider.
- **No secrets in source**. Use `.env` (never committed) or a secret manager.

## Pull request template (suggested)

```md
## Summary
- 1–3 bullets describing what changed and why.

## Pillars touched (12-pillar audit)
- [ ] AGENTS.md / skills / contracts / agents / grader / plateau / notebooks /
      docker / README / benchmark / ADRs / tests — list which ones this PR moves.

## Verification
- [ ] `pnpm run ci` green (paste the last 20 lines)
- [ ] `pnpm run bench` numbers within ± 20% of BENCHMARK.md
- [ ] `docker compose config -q` exits 0
- [ ] New tests cover the surface I touched

## Risks + rollback
- What could regress, how to roll back.

## ADRs
- ADR-XXXX (or "no new ADR — rationale").

## Generated artifacts
- e.g. JSON-Schema regenerated via `pnpm run contracts:build`.
```

## Code review checklist (for the reviewer)

- [ ] Branch is from a fork of `master` (or the foundation PR) and is up to date.
- [ ] Conventional commit history; no fixup commits.
- [ ] No raw `Error` from routes; `ResponseError` everywhere.
- [ ] No `as unknown as` casts on the production hot paths.
- [ ] Tests cover happy + at least one error path.
- [ ] If schema changes → migration guide in `docs/CONTRACTS.md` or in `ROADMAP.md`.
- [ ] If new endpoint → `docs/ARCHITECTURE.md#api-contract` updated.

## Release process

- Tag `vX.Y.Z-fde-foundation` (or `-rc.N`) on the merged commit.
- Generate GitHub release notes from commits in the tag's merge base.
- Public consumption: publish Docker images + a public SDK per `ROADMAP.md` v1.5.

## Community

- Code of Conduct: TODO (will be added before v1.5 — see `ROADMAP.md`).
- Discussions: GitHub Discussions.
- Security reports: see `SECURITY.md`.
