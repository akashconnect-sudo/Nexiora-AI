# Deploy Nexiora to Vercel (one project)

## Same project: Web + API together

Use **one** Vercel project (e.g. `nexiora-ai`) with:

- **Root Directory:** `apps/web`
- NestJS is built and mounted as `/api/[...path]` with rewrites for `/v1/*`

Login calls `/v1/auth/...` on the **same domain** — no separate API project required.

### Env (this project)

API / DB / Stripe / email (server):

```text
DATABASE_URL=...
CORS_ORIGINS=https://nexiora-ai-api.vercel.app
PUBLIC_WEB_URL=https://nexiora-ai-api.vercel.app
PUBLIC_API_URL=https://nexiora-ai-api.vercel.app
IP_HASH_SECRET=...
AUTH_JWT_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_FREE=...
STRIPE_PRICE_PRO=...
STRIPE_PRICE_BUSINESS=...
RESEND_API_KEY=re_...
EMAIL_FROM=Nexiora AI <onboarding@resend.dev>
```

**Production email:** set `RESEND_API_KEY` on Vercel. Gmail SMTP (`SMTP_*`) works on localhost but is blocked/hangs on Vercel serverless — do not rely on SMTP there.

Optional local-only SMTP (not for Vercel):

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Nexiora AI <...>
```

Web browser URL:

```text
NEXT_PUBLIC_API_URL=
```

Leave **empty**, or delete the variable. If you set it to the same site URL, the app still uses same-origin automatically.

Do **not** set `NEXT_PUBLIC_API_URL=http://localhost:3001` on Vercel.

### After env / code change

Redeploy **this same project** once (Deployments → Redeploy / push to `main`). A brand-new Vercel project is not required.

### Verify

1. `https://YOUR-DOMAIN/health` → JSON (not HTML)
2. `https://YOUR-DOMAIN/v1/billing/plans` → JSON
3. Login → OTP email / code
