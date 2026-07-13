# Security Plan

**Product:** Nexiora AI / Nova Search  
**Document:** SEC-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Objectives

- Protect user data, API keys, and search privacy  
- Prevent abuse that drives unbounded LLM/search cost  
- Meet OWASP Top 10 controls  
- Build toward SOC 2 Type I / GDPR readiness  

---

## 2. Threat Model (STRIDE summary)

| Threat | Example | Control |
|--------|---------|---------|
| Spoofing | Stolen session | Short-lived JWT, refresh rotation, device revoke, passkeys/2FA |
| Tampering | Modified citations | Server-side generation; signed export hashes |
| Repudiation | Admin misuse | Immutable audit logs |
| Info disclosure | PII in logs | Redaction middleware; no raw prompts with secrets in logs |
| DoS | Search flood | Rate limits, WAF, captcha, queue admission control |
| Elevation | User→admin | RBAC, least privilege, break-glass audited |

---

## 3. Authentication & Authorization

| Control | Detail |
|---------|--------|
| AuthN | Clerk (recommended) or Auth.js — OAuth, email, OTP, passkeys |
| 2FA | TOTP mandatory for admin; optional for users |
| Tokens | Access JWT ≤ 15m; refresh rotated; reuse detection |
| API keys | Prefix + hash at rest; scoped; rotatable |
| AuthZ | Global roles + workspace roles; guards on every mutation |
| Admin | Separate session policy; step-up auth for destructive actions |

---

## 4. Application Security (OWASP)

| Risk | Mitigation |
|------|------------|
| Injection | Prisma parameterized; no raw SQL unless audited; Zod validation |
| XSS | React escaping; CSP; sanitize markdown render (DOMPurify or rehype-sanitize) |
| CSRF | SameSite cookies; double-submit or origin checks for cookie sessions |
| SSRF | Adapter URL allowlists; block link-local/metadata IPs |
| Broken access | Integration tests for IDOR on search/collections |
| Security misconfig | Hardened Docker; no default secrets; security headers |
| Vulnerable components | Dependabot / Renovate; CI audit |
| Auth failures | Lockout/backoff; anomaly alerts |
| Integrity failures | CI signing; provenance later |
| Logging failures | Central logs; alert on auth spikes |

**Headers:** HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Frame-Ancestors none (app).

---

## 5. Data Protection

- TLS 1.2+ everywhere  
- Encryption at rest: Postgres, object storage, volumes  
- Field-level encryption for sensitive tokens if stored  
- IP stored only as keyed HMAC hash  
- Private mode: no durable history  
- GDPR: export + delete workflows with verification  

---

## 6. Abuse & Cost Security

- Per-IP and per-user rate limits  
- Progressive captcha on anon abuse signals  
- Per-plan hard quotas + burst tokens  
- Provider budget circuit breakers  
- Prompt injection defenses: tool allowlists, untrusted content delimited, no secret exfil in tools  

---

## 7. AI-Specific Safety

- Citation-required policy for factual claims  
- Healthcare/legal/finance disclaimers  
- Refuse clearly disallowed categories per policy  
- Log model/version for forensic replay of evals (not full PII prompts in cleartext long-term)  

---

## 8. Secrets Management

- Local: `.env` (gitignored) from `.env.example`  
- Prod: AWS Secrets Manager / Cloudflare secrets  
- No secrets in images; rotate on incident  

---

## 9. Audit & Monitoring

- AuditLog for authz changes, billing, API key lifecycle, admin actions  
- Security dashboard: failed logins, rate-limit trips, 5xx, cost anomalies  
- PagerDuty/OpsGenie for Sev-1  

---

## 10. Secure SDLC

- PR reviews required on `main`  
- SAST (CodeQL), dependency scan, container scan  
- Secret scan (gitleaks)  
- Threat model updates per major feature  

---

## 11. Incident Response (Brief)

1. Detect → 2. Contain (revoke keys/sessions) → 3. Eradicate → 4. Recover → 5. Postmortem (blameless)  
RTO/RPO per Architecture; customer notification per legal.

---

## 12. Approval

Security plan approval required before production traffic.
