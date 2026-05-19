# Deploy Glide to Vercel

**Production URL:** [https://glide-arc.vercel.app](https://glide-arc.vercel.app)

## Arc Testnet (reference)

| Resource | URL |
|----------|-----|
| Explorer | [testnet.arcscan.app](https://testnet.arcscan.app/) |
| Public USDC faucet | [faucet.circle.com](https://faucet.circle.com/) (Arc Testnet, 20 USDC / 2h) |
| Chain ID | `5042002` |
| Gas token | **USDC** (not ETH) |

In-app **Add Cash** uses Circle’s testnet API; you can also fund wallets manually via the public faucet.

## 1. Push to GitHub

Ensure `main` is up to date on `0xdopewilly/glide`.

## 2. Import on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `0xdopewilly/glide`
2. Framework: **Next.js** (auto-detected)
3. Build command (recommended):

   ```bash
   npx prisma migrate deploy && npm run build
   ```

4. Install command: `npm install` (default)

## 3. Environment variables

Add these in **Project → Settings → Environment Variables** for **Production** (and Preview if you want):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **connection pooling** URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase **direct** URL (port 5432) — required for migrations |
| `CIRCLE_API_KEY` | Circle Console |
| `CIRCLE_ENTITY_SECRET` | Circle Console |
| `CIRCLE_KIT_KEY` | **Kit Key** for swap/bridge — full value `KIT_KEY:<keyId>:<keySecret>` from [Circle Kit keys](https://developers.circle.com/w3s/keys#kit-keys). **Not** the same as `CIRCLE_API_KEY` (`TEST_API_KEY:...`). Must be from the **same Circle project** as `CIRCLE_API_KEY`. After deploy, open `/api/health/kit` — should return `{ "ok": true }`. |
| `GROQ_API_KEY` | [Groq](https://console.groq.com/keys) — powers the Ask tab assistant |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key (`npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Web Push private key (server only) |
| `VAPID_SUBJECT` | `mailto:you@yourdomain.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | e.g. `https://dynamic-turkey-46.clerk.accounts.dev` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |

URL-encode special characters in database passwords (`@` → `%40`).

### Where env vars live (swap kit key)

| Environment | Where to set `CIRCLE_KIT_KEY` |
|-------------|-------------------------------|
| Local `npm run dev` | `.env.local` in the repo root (not committed) |
| Production | Vercel → Project → **Settings → Environment Variables** → scope **Production** |
| Preview deploys | Same page, scope **Preview** (optional; uses Production vars if unset) |

There is **no other place** in this repo to paste the kit key — swap reads `process.env.CIRCLE_KIT_KEY` (or alias `KIT_KEY`) at runtime only. After changing Vercel vars you must **Redeploy** (env is baked in at build/deploy). Verify: `https://glide-arc.vercel.app/api/health/kit` → `{ "ok": true, "source": "CIRCLE_KIT_KEY", ... }`.

## 4. Clerk

**`glide-arc.vercel.app` cannot be Clerk Production “Primary domain”** (stays Pending — no DNS on `vercel.app`).

Use **Development** keys on Vercel and add `https://glide-arc.vercel.app` as an allowed app URL only. See **[CLERK.md](./CLERK.md)**.

## 5. Deploy

Click **Deploy**. After build:

- `https://glide-arc.vercel.app/api/health/db` → `{ "ok": true }`
- Sign up → wallet + activity should work on Arc testnet

## 6. Optional: custom domain

Vercel → **Domains** → add `glide.yourdomain.com` and update Clerk allowed origins.
