# Deploy Nexiora Web to Vercel

## What goes where

| App | Host | Why |
|-----|------|-----|
| **Web** (`apps/web`) | **Vercel** | Next.js is first-class on Vercel |
| **API** (`apps/api`) | Railway / Render / Fly.io | NestJS needs a long-running Node server — not a standard Vercel static/serverless Next app |

`nexiora-ai-api` on Vercel with NestJS + custom CNAME usually fails (e.g. **Delete CNAME**). Deploy **web** as a Next.js monorepo project instead.

## One-time Vercel project setup

1. Open [Vercel New Project](https://vercel.com/new) → import **[akashconnect-sudo/Nexiora-AI](https://github.com/akashconnect-sudo/Nexiora-AI)**.
2. Framework: **Next.js**
3. **Root Directory:** `apps/web` (important for this monorepo)
4. Install / Build are already in `apps/web/vercel.json` — leave as-is or confirm:
   - Install: `cd ../.. && pnpm install`
   - Build: `cd ../.. && pnpm --filter @nexiora/shared build && pnpm --filter @nexiora/web build`
5. Environment variables (Production + Preview):

```text
NEXT_PUBLIC_API_URL=https://YOUR-API-HOST
NEXT_PUBLIC_WEB_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
```

6. Deploy. Do **not** attach a custom domain until the first `*.vercel.app` deploy succeeds (avoids CNAME errors).

## CLI (same Vercel account as the dashboard)

```bash
cd apps/web
vercel link          # pick team + create project "nexiora-ai" (not nexiora-ai-api)
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_WEB_URL production
vercel --prod
```

## After web is live

Host Nest API separately, set `CORS_ORIGINS` to your Vercel URL, then update `NEXT_PUBLIC_API_URL` and redeploy web.
