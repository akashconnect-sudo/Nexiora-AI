# Deploy Nexiora to Vercel

## What goes where

| App                  | Vercel project (example) | Root Directory | Notes                                      |
| -------------------- | ------------------------ | -------------- | ------------------------------------------ |
| **Web** (`apps/web`) | `nexiora-ai`             | `apps/web`     | Next.js marketing + app UI                 |
| **API** (`apps/api`) | `nexiora-api`            | `apps/api`     | NestJS serverless handler (`api/index.js`) |

Do **not** point `NEXT_PUBLIC_API_URL` at the web project URL. Web returns HTML; login needs JSON from `/v1/...`.

---

## 1) Deploy API (new Vercel project)

1. [Vercel New Project](https://vercel.com/new) → import **akashconnect-sudo/Nexiora-AI**.
2. Project name: e.g. `nexiora-api` (not the same as the web project).
3. **Root Directory:** `apps/api` (Edit → select folder).
4. Framework: **Other**.
5. Install / Build are in `apps/api/vercel.json` — leave them.
6. Add **Environment Variables** (Production + Preview):

```text
NODE_ENV=production
DATABASE_URL=postgresql://...supabase...?sslmode=require
CORS_ORIGINS=https://YOUR-WEB.vercel.app
PUBLIC_API_URL=https://YOUR-API.vercel.app
PUBLIC_WEB_URL=https://YOUR-WEB.vercel.app
IP_HASH_SECRET=change-me-to-a-long-random-string
AUTH_JWT_SECRET=change-me-to-another-long-secret

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FREE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=Nexiora AI <your@gmail.com>

REDIS_URL=redis://localhost:6379
```

`REDIS_URL` can stay as localhost for now (API falls back when Redis is down). For production rate limits later, add Upstash Redis.

7. Deploy. Open `https://YOUR-API.vercel.app/` — should return JSON like `{ "name": "Nexiora AI API", "status": "ok" }`.
8. Also check `https://YOUR-API.vercel.app/health`.

---

## 2) Point Web at the API

In the **web** Vercel project (`nexiora-ai` / whatever serves the UI):

```text
NEXT_PUBLIC_API_URL=https://YOUR-API.vercel.app
NEXT_PUBLIC_WEB_URL=https://YOUR-WEB.vercel.app
```

No trailing slash. Then **Redeploy** the web project (env changes apply only after rebuild).

---

## 3) Stripe webhook (after API is live)

Stripe Dashboard → Developers → Webhooks → endpoint:

`https://YOUR-API.vercel.app/v1/billing/webhook`

Copy signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy API.

---

## Local vs Production

| Place                  | `NEXT_PUBLIC_API_URL`                |
| ---------------------- | ------------------------------------ |
| Local `.env`           | `http://localhost:3001`              |
| Vercel **web** project | `https://YOUR-API.vercel.app`        |
| Never                  | Web site URL / `localhost` on Vercel |
