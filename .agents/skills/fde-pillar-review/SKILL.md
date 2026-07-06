---
name: fde-pillar-review
description: Audit checklist for the 12 FDE pillars — what file proves what.
---

# fde-pillar-review

The 12 FDE pillars and the file that proves each one is implemented.

| # | Pillar | Proof file or directory |
| --- | --- | --- |
| 1 | Agent-legible procedural memory | `AGENTS.md` |
| 2 | Skills vs tools distinction | `.agents/skills/` + `miro-custom-mcp/src/tools/` |
| 3 | Typed, versioned sprint contracts | `shared/contracts/` + `scripts/check_contract_versions.ts` |
| 4 | Three-agent adversarial harness | _deferred — next session_ |
| 5 | Four-axis grader | _deferred — next session_ |
| 6 | Plateau-detection scorer | _deferred — next session_ |
| 7 | Notebook authoring surface | _deferred — next session_ |
| 8 | Containerization | `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.mcp`, `docker-compose.yml` |
| 9 | FDE-narrative README | `README.md` |
| 10 | Honest benchmark doc | _deferred — next session_ (`docs/BENCHMARK.md`) |
| 11 | Architecture Decision Records | `docs/adr/` |
| 12 | Full test coverage | `vitest.config.ts` + `tests/`, `server/**/*.test.ts`, `shared/**/*.test.ts` |

## How to use this skill

Run before merging a foundation PR. Open every "proof file" listed above and
confirm it is **non-empty, dated, and references the underlying artifacts**.

If a pillar is listed as deferred, do NOT attempt to add it in this PR — leave
it for the next session.
