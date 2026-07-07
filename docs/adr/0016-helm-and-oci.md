# ADR-0016: Helm chart + GHCR OIDC publish

- Status: Accepted
- Date: 2026-07-07

## Context

v1.0 ships three Dockerfiles and a `docker-compose.yml`. v1.0 has no
Kubernetes deployment story. v1.0 publishes images only locally (the
`publish-images` CI job is a draft, never merged).

## Decision

Ship a **Helm chart** for k8s deploys and a **GHCR OIDC trusted
publisher** workflow.

### Chart

- Path: `deploy/helm/miro-workflows/`.
- `Chart.yaml`, `values.yaml`, `values-prod.yaml`, `templates/`:
  - `api-deployment.yaml` — 1+ replicas, liveness + readiness probes
    pointed at `/api/health` (the existing endpoint).
  - `web-deployment.yaml` — 1+ replicas, nginx serves the static
    bundle.
  - `mcp-statefulset.yaml` — stdio MCP, side-car proxy not required.
  - `secret.yaml` — `miroTokenEncryptionKey`, `miroWebhookSecret`,
    `tokenSigningSecret` (all `Opaque` + sealed-secrets compatible).
  - `service.yaml`, `ingress.yaml` (with TLS + cert-manager annotations).

### OIDC trusted publisher

- `.github/workflows/release.yml` (new, mirrors the existing `ci.yml`).
- Triggered on annotated tag `v*.*.*`.
- Uses `docker/login-action@v3` with `registry: ghcr.io` and the
  `permissions: packages: write` token.
- Builds and pushes `ghcr.io/Alexi5000/miro-workflows/api:1.1.0` (etc.)
  + multi-arch (amd64 / arm64) via `docker buildx`.
- Optional: cosign sign with `COSIGN_KEY` if set.

### Rollout

- Helm: `helm upgrade --install miro-workflows ./deploy/helm/miro-workflows -n miro -f values-prod.yaml`.
- The chart reads `MIRO_TOKEN_ENCRYPTION_KEY`, `MIRO_WEBHOOK_SECRET`,
  `MIRO_WORKFLOWS_TOKEN_SECRET` from a `Secret` resource, not env.
- A `Job` template runs `pnpm run db:migrate` before the `Deployment`
  rolls out (init container pattern).

## Consequences

- ✅ A `helm install` from the chart is the only thing operators do to
  deploy.
- ✅ Container images are GHCR-published and OIDC-signed.
- ⚠️ The chart is opinionated (Postgres via the in-cluster dependency;
  ingress via cert-manager). For EKS / GKE / AKS specifics, the
  maintainer adds per-cloud values in a follow-up.
- ⚠️ Sealed Secrets or External Secrets Operator is recommended for
  prod; the chart ships vanilla `Secret` for simplicity.

## Alternatives considered

- **kustomize instead of Helm**: rejected — Helm's templating + `values.yaml`
  is the lowest-friction option for a small monorepo.
- **GHCR OIDC without cosign**: not an alternative; cosign is opt-in.
- **Fly.io / Railway one-click deploy**: deferred to a follow-up
  (`scripts/fly.toml` / `railway.toml`).
