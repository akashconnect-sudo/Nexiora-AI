# DevOps Plan

**Product:** Nexiora AI / Nova Search  
**Document:** DEVOPS-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Environments

| Env        | Purpose                                | Data                   |
| ---------- | -------------------------------------- | ---------------------- |
| local      | Developer compose stack                | Synthetic              |
| ci         | Ephemeral PR previews / testcontainers | Synthetic              |
| staging    | Pre-prod, prod-like                    | Anonymized / synthetic |
| production | Live                                   | Real                   |

Promotion: `main` → staging (auto) → production (manual approval).

---

## 2. CI/CD (GitHub Actions)

**On PR**

- pnpm install (cache)
- lint, typecheck
- unit + integration tests
- OpenAPI diff check
- build web + api
- container build (no push) + Trivy scan
- CodeQL / gitleaks

**On main**

- All PR checks
- Push images to ECR/GHCR
- Deploy staging (K8s or Compose-on-VM early)
- Smoke tests

**Release**

- Tag `vX.Y.Z`
- Deploy prod with approval gate
- DB migrate expand job before traffic
- Canary 10% → 50% → 100%

---

## 3. Infrastructure as Code

- Terraform: VPC, EKS (or ECS early), RDS, ElastiCache, OpenSearch, S3, IAM, Cloudflare
- K8s manifests/Helm: api, worker, web
- docker-compose for local parity

**Early-stage option:** ECS Fargate before EKS if team is small — same containers.

---

## 4. Observability

| Pillar  | Stack                                            |
| ------- | ------------------------------------------------ |
| Metrics | Prometheus + Grafana                             |
| Traces  | OpenTelemetry → Tempo/Jaeger or vendor           |
| Logs    | Loki or CloudWatch + structured JSON             |
| Alerts  | Burn rate SLO, error rate, queue depth, cost/day |

**Golden signals for Search:** traffic, latency (TTFT), errors, saturation (queue), **$/search**.

---

## 5. Feature Flags

- LaunchDarkly or open-source Flagsmith
- Flags for new adapters, models, UI experiments

---

## 6. Cost Controls

- Budgets on AWS + LLM providers
- Per-environment API key isolation
- Spot/graviton for workers where safe

---

## 7. Developer Experience

- `pnpm dev` via Turborepo pipeline
- One-command `scripts/bootstrap`
- Seed scripts for plans + trust domains
- Preview deployments for `apps/web` on Vercel (API to staging)

---

## 8. Approval

DevOps baseline approval before staging exists.
