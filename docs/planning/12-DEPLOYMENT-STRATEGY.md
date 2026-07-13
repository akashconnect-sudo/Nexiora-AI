# Deployment Strategy

**Product:** Nexiora AI / Nova Search  
**Document:** DEPLOY-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Topology (Production Target)

| Component | Deploy target |
|-----------|---------------|
| `apps/web` | Vercel (Edge/CDN) or Cloudflare Pages + containers |
| `apps/admin` | Same as web, restricted auth |
| `apps/api` | Kubernetes/ECS behind ALB + Cloudflare |
| `apps/worker` | Same cluster, separate deployment |
| Postgres | RDS Multi-AZ |
| Redis | ElastiCache cluster |
| OpenSearch | AWS OpenSearch Service |
| Qdrant | Self-managed on K8s or Qdrant Cloud |
| Objects | Cloudflare R2 + S3 backup |
| Desktop | Signed installers via GitHub Releases |
| Mobile | App Store / Play Store |

---

## 2. Release Process

1. PR → CI green → merge `main`  
2. Auto-deploy **staging**  
3. Smoke + AI eval subset  
4. Manual approval → **production canary**  
5. Monitor SLO 30–60 min  
6. Full rollout  
7. Tag release notes  

---

## 3. Database Migrations

- Expand/contract pattern  
- Migrate job runs as Init/Job before new pods serve traffic  
- Never destructive contract in same release as expand  
- Rollback: reverse contract only if safe; else forward-fix  

---

## 4. Rollback

| Layer | Rollback |
|-------|----------|
| Web | Instant previous deployment |
| API/Worker | Previous image tag + Helm revision |
| Feature | Flag off |
| Data | PITR if corruption (last resort) |

---

## 5. Zero-Downtime

- Rolling updates maxUnavailable 25%  
- Readiness probes on `/ready`  
- Draining WebSocket connections with connection TTL  

---

## 6. Multi-Region (Phase 5)

- Active-passive API  
- DB replica promotion runbook  
- Geo-DNS / Cloudflare steering  
- Stateless sessions; sticky only if required for WS (prefer reconnectable streams)  

---

## 7. Client Distribution

| Client | Channel |
|--------|---------|
| PWA | Web manifest + service worker |
| Electron | Code-signed DMG/MSI/AppImage; auto-update |
| iOS/Android | Store review; staged rollout |

---

## 8. Compliance Artefacts

- Deployment SBOM attached to release  
- Change log linked to ticket IDs  
- Access to prod via SSO + audited break-glass  

---

## 9. Go-Live Checklist (MVP)

- [ ] Secrets loaded  
- [ ] Migrations applied  
- [ ] WAF rules on  
- [ ] Stripe webhooks verified  
- [ ] LLM/search provider keys scoped  
- [ ] Dashboards + alerts live  
- [ ] Status page configured  
- [ ] Legal pages live (ToS, Privacy)  
- [ ] Backup restore drill completed once  

---

## 10. Approval

Deployment strategy approval required before first production cutover.
