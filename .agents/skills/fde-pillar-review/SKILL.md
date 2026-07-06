---
name: fde-pillar-review
description: Audit checklist for the 12 FDE pillars — what file proves what.
---

# fde-pillar-review

The 12 FDE pillars and the file that proves each one is implemented in this repo.

| # | Pillar | Proof file or directory | Status |
| --- | --- | --- | --- |
| 1 | Agent-legible procedural memory | `AGENTS.md` | Implemented |
| 2 | Skills vs tools distinction | `.agents/skills/` + `miro-custom-mcp/src/tools/registry.ts` | Implemented |
| 3 | Typed, versioned sprint contracts | `shared/contracts/` + `scripts/check_contract_versions.ts` | Implemented |
| 4 | Three-agent adversarial harness | `src/agents/{harness,planner,generator,evaluator}.ts` | Implemented |
| 5 | Four-axis grader | `src/agents/grader.ts` | Implemented |
| 6 | Plateau-detection scorer | `src/agents/plateau.ts` | Implemented |
| 7 | Notebook authoring surface | `notebooks/*.md` | Implemented |
| 8 | Containerization | `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.mcp`, `docker-compose.yml` | Implemented |
| 9 | FDE-narrative README | `README.md` | Implemented |
| 10 | Honest benchmark doc | `docs/BENCHMARK.md` + `scripts/bench.ts` + `miro-custom-mcp/scripts/bench.ts` | Implemented |
| 11 | Architecture Decision Records | `docs/adr/` | Implemented |
| 12 | Full test coverage | `vitest.config.ts` + `tests/`, `server/**/*.test.ts`, `shared/**/*.test.ts`, `src/agents/**/*.test.ts` | Implemented |

## How to use this skill

Run before merging a foundation PR. Open every "proof file" listed above
and confirm it is **non-empty, dated, and references the underlying
artifacts**. Use `scripts/validate_setup.ts` to mechanically assert the
file list.

If a pillar is accidentally regressed (file deleted or stubbed out), the
list above is the first place to look.
