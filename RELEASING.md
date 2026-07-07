# Releasing

> **Audience:** the maintainer cutting a release of Miro Workflows.
> **Cadence:** ad-hoc per `ROADMAP.md` milestone; pre-1.x means roughly once per foundation cut.

This document is the source of truth for the release process. It is
deliberately short and assumes the maintainer is familiar with the
repo (see `AGENTS.md` + `docs/ARCHITECTURE.md` for the basics).

## 0. Pre-release checklist

Run all of these from the repo root:

```bash
# 0.1 — Clean working tree, on master, in sync with origin.
git checkout master
git pull --ff-only origin master
git status  # nothing to commit, working tree clean

# 0.2 — Full CI gate (typecheck + contracts + tests + smoke + validate + bench).
pnpm run ci
pnpm run bench        # paste the numbers into docs/BENCHMARK.md if they drift.
pnpm run openapi:build # regenerates docs/openapi.json; commit if it changed.

# 0.3 — Container builds.
docker build -f Dockerfile.api .  && echo "api OK"
docker build -f Dockerfile.mcp .  && echo "mcp OK"
docker build -f Dockerfile.web .  && echo "web OK"
docker compose -f docker-compose.yml config -q && echo "compose OK"
```

If any step fails — **STOP** and fix the regression before tagging.
A v1.0+ release must be green across every gate above.

## 1. Bump versions

```bash
# 1.1 — Root package (HTTP API + dashboard).
$EDITOR package.json   # bump "version" (SemVer)

# 1.2 — MCP package. Always bumped independently of the root when MCP
# tools change; matches the root only on major cuts.
$EDITOR miro-custom-mcp/package.json
```

Update the matching changelog entry in `CHANGELOG.md`. Update the
`Captured at` row in `docs/BENCHMARK.md` if the bench changed.

## 2. Update `ROADMAP.md`

Mark the released version as done, and shift future-version lines down
if you crossed a major boundary. Example:

```diff
- ## v1.1 — Production auth + Postgres pivot (planned: 4 weeks)
- **Tag:** `v1.1.0`
+ ## v1.1 — Production auth + Postgres pivot (DONE)
+ **Tag:** `v1.1.0` (cut from commit `abcd1234`)
+
+ ## v1.2 — Real Miro REST + webhooks (planned)
+ **Tag:** `v1.2.0`
```

## 3. Commit + tag

```bash
# 3.1 — Commit the version bumps.
git add -A
git commit -m "release: vX.Y.Z — <one-line summary>"

# 3.2 — Annotated tag (with the release notes summary in the body).
git tag -a vX.Y.Z -m "vX.Y.Z — <one-line summary>"
```

## 4. Push everything

```bash
# 4.1 — Push the commit + the new tag.
git push origin master
git push origin vX.Y.Z

# 4.2 — Sync every working branch that has new commits.
# (Per "Sync all branches to main" in the release process.)
for branch in $(git branch -r | grep -v 'HEAD' | sed 's@origin/@@'); do
  local_sha=$(git rev-parse "origin/${branch}")
  master_sha=$(git rev-parse origin/master)
  if [ "$local_sha" = "$master_sha" ]; then
    continue
  fi
  if git merge-base --is-ancestor "$master_sha" "origin/${branch}"; then
    echo "fast-forwarding $branch"
    git push origin "${branch}:${branch}" --force-with-lease
  else
    echo "WARN: $branch diverged from master; manual review needed"
  fi
done
```

## 5. GitHub Release (manual)

1. Open <https://github.com/Alexi5000/miro-workflows/releases/new>.
2. Choose tag `vX.Y.Z`.
3. Title: `Miro Workflows vX.Y.Z — <one-line summary>`.
4. Body: paste the matching `CHANGELOG.md` section verbatim.
5. ✅ Check "Set as the latest release" (for v1.x and v2.x majors).
6. Attach build artifacts: nothing for v1.0+ (consumers build from
   source via `pnpm install`); for v1.5+ attach signed GHCR images
   (see `Dockerfile.publish` in `ci.yml`).

## 6. Post-release

- [ ] Verify the README badge on `master` reflects the new tag.
- [ ] Update `.github/REPOSITORY.md` if the GitHub description / topics
      need to change.
- [ ] Open an issue or discussion if the vX.Y.Z release has
      upgrade-action items (e.g. "rotate the `MIRO_WORKFLOWS_TOKEN_SECRET`").
- [ ] Bump `feature/fde-foundation-pr` if it exists and is divergent from
      `master` (the next loop will rebase it on top of the new release).

## 7. Rollback procedure

```bash
# 7.1 — On master, hot-fix forward (preferred).
git revert <bad-sha>
git commit -m "fix: revert <reason>"
git push origin master

# 7.2 — Or re-tag an older commit.
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z <older-sha> -m "vX.Y.Z — re-tagged"
git push origin vX.Y.Z
```

Document the rollback in `CHANGELOG.md` with a `### Changed` entry under
the affected version.

## Appendix — version policy

| Bump | When | Examples |
| --- | --- | --- |
| **Major (X.0.0)** | Breaking API/contract change; auth wall swap; Postgres pivot. | 1.0.0 → 2.0.0 |
| **Minor (0.Y.0 / X.Y.0)** | New tool / new endpoint / new ADR / new ADRs batch / new feature behind a feature flag. | 1.0.0 → 1.1.0 |
| **Patch (0.0.Z)** | Bug fix, security patch, doc fix, test fix, performance fix. | 1.0.0 → 1.0.1 |

Pre-1.x: anything can break. Post-1.x: major bumps ship with a
migration guide in `CHANGELOG.md` and a draft ADR in `docs/adr/`.
