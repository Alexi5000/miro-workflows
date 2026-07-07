# Repository metadata

This file is the canonical source of truth for the **About** sidebar on
GitHub: <https://github.com/Alexi5000/miro-workflows>.

> Apply the following in **Settings → General** of the GitHub repo.
> The settings panel is the only place GitHub actually renders the values.

## About

- **Description (140 chars max):**

  `Production-grade Miro command center: React dashboard, Node API, custom MCP server (20 tools), typed contracts, three-agent planning harness, OAuth device flow, Prometheus metrics, full Docker stack.`

- **Website:**
  `https://github.com/Alexi5000/miro-workflows#readme`

- **Topics** (case-sensitive, max 20):

  | Topic | Why |
  | --- | --- |
  | mcp | Model Context Protocol |
  | model-context-protocol | Long form |
  | miro | Domain |
  | miro-workflows | Brand |
  | workflows | Domain |
  | typescript | Stack |
  | nodejs | Stack |
  | react | Stack |
  | vite | Stack |
  | sqlite | Persistence |
  | zod | Validation |
  | nygard | ADR format |
  | adr | Architecture Decision Records |
  | agents | Three-agent harness |
  | llm | Compatible with Claude / codex |
  | claude | Tested with Claude |
  | codex | Tested with codex |
  | openapi | OpenAPI 3.1 spec |
  | prometheus | Metrics |
  | docker | Containerized |

- **Releases:**
  - Mark `v1.0.0` as the **Latest** release.
  - Keep the legacy `v1.0.0-fde-foundation` tag as a stable marker
    (tag-only, no GitHub Release).

## Social preview

The file `assets/readme/hero.png` is what GitHub renders in the social
preview when someone shares a link to the repo. No action needed — it's
already linked in the README at the top.

## Branch protection

In **Settings → Branches → Branch protection rules → Add rule**:

- Pattern: `master`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Required checks: `Unit + UI + MCP tests` (from `.github/workflows/ci.yml`)
  - Required checks: `Compose lint` (from the same file)
- ✅ Require linear history
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

## Required GitHub Apps / secrets

The CI workflow at [`.github/workflows/ci.yml`](./workflows/ci.yml) only
reads the repository and uses the default `GITHUB_TOKEN`. It does not
require additional secrets for `master` builds.

The optional **publish-images** job (also in `ci.yml`) only runs on
pushes to `master` and requires:

- `GITHUB_TOKEN` (built-in) — used to log in to `ghcr.io`.
- _Optional_ `COSIGN_KEY` — for signing container images (v1.1 hardening).

## Files that power the showcase

| File | Renders in |
| --- | --- |
| `README.md` | Repo homepage |
| `assets/readme/hero.png` | README hero image, social preview |
| `assets/readme/dashboard-preview.png` | README preview section |
| `assets/readme/architecture.png` | (Legacy) — README now uses Mermaid instead |
| `assets/readme/api-contract.png` | (Legacy) — README now uses the OpenAPI table |
| `assets/cover.png` | GitHub social preview (Open Graph default) |
| `assets/icon.png` | Repo icon / favicon |
