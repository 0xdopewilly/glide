# Glide

**Send money like Cash App — on Arc testnet.**

**GLIDE ON!** 🛝

Live app: **[glide-arc.vercel.app](https://glide-arc.vercel.app)**

Glide is a mobile-first crypto wallet: USDC on [Arc testnet](https://testnet.arcscan.app/), Circle developer wallets, Clerk auth, and an AI assistant on the Ask tab. Pay by **@username**, wallet address, or contact name — not just hex strings.

---

## What works today

| Feature | Notes |
|--------|--------|
| **@usernames** | Pick once at signup; send to `@khadee` or a saved contact |
| **Send & receive** | Keypad flow, balance, push when you get paid |
| **Ask (AI)** | Groq-powered assistant — send, swap, bridge via chat |
| **Swap & bridge** | USDC ↔ EURC on Arc; bridge to Sepolia testnets |
| **Activity** | Transaction history at `/activity` |
| **QR scan** | Pay via `/scan` (scanner UI polish in progress) |
| **Push notifications** | Web push for send, receive, swap, bridge |
| **Motion** | Horizontal slide transitions between screens |

---

## Recently shipped

| Feature | How to use |
|--------|------------|
| **Request money** | `/request` — amount + note → share link & square QR |
| **Payment notes** | Optional note on Send review → shows in Activity |
| **Activity filters** | `/activity` — All / Sent / Received / Swap / Bridge |
| **QR pay** | `/scan` — square viewfinder; supports pay links & requests |
| **Split a bill** | Ask: `split $60 with @a @b @c` (equal shares) |
| **Scheduled sends** | Profile → weekly/monthly (needs `CRON_SECRET` + Vercel cron) |
| **Privacy** | Profile → hide balance / blur activity amounts |

---

## Stack

- **Next.js 16** (App Router) · **React** · **Tailwind**
- **Clerk** — auth
- **Circle** — developer-controlled wallets, App Kit swap/bridge
- **Arc testnet** — USDC gas & balances
- **Supabase / Prisma** — Postgres
- **Groq** — Ask tab assistant
- **Framer Motion** — transitions & micro-interactions

---

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in secrets — see DEPLOY.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Circle env vars** (server only — never commit `.env.local`):

| Variable | Format |
|----------|--------|
| `CIRCLE_API_KEY` | Full `TEST_API_KEY:id:secret` |
| `CIRCLE_KIT_KEY` | Full `KIT_KEY:id:secret` (swap; same Circle app as API key) |
| `CIRCLE_ENTITY_SECRET` | 64-char hex, no prefix |

After deploy, verify: `/api/health/kit` → `{ "ok": true }`.

Production deploy: **[DEPLOY.md](./DEPLOY.md)** · Clerk: **[CLERK.md](./CLERK.md)**

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Migrate + production build |
| `npm run db:migrate` | Prisma migrate (local) |
| `npm run db:studio` | Prisma Studio |

---

## Repo

**GitHub:** [github.com/0xdopewilly/glide](https://github.com/0xdopewilly/glide)

Built for Arc testnet. Fund wallets via [Circle faucet](https://faucet.circle.com/) (Arc Testnet).

**GLIDE ON!**
