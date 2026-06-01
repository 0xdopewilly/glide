# glidepay

**A Cash App for stablecoins.** Built on Arc, Circle's payments chain.

Live: **[glide-arc.vercel.app](https://glide-arc.vercel.app)** · Repo: **[github.com/0xdopewilly/glide](https://github.com/0xdopewilly/glide)**

---

## What is this, in plain English

You know how Venmo lets you send your friend $20 with a username and a tap? glidepay is that — except the dollars are **on a blockchain**, and your friend can be **anywhere in the world**.

We hide every uncomfortable bit of crypto:
- **No seed phrases.** You sign in with email or Google. That's it.
- **No "Connect Wallet" pop-ups.** glidepay creates a wallet for you in the background.
- **No "what's gas?"** Arc uses USDC as its gas token, and we sponsor the rest. The user never funds anything.
- **No hex addresses.** Pay `@khadee`, not `0x47304e42…d2fc27`.

The result is an app that **feels like Cash App and acts like crypto** — fast, programmable money that crosses borders in seconds.

---

## The killer feature: **Universal Receive**

This is the one to brag about.

> One address. Any chain. USDC sent to your glidepay handle from **Ethereum, Base, Polygon, or Arbitrum** automatically ends up in your wallet on **Arc** — usually within 60 seconds.

What the sender sees: "Send USDC to `0x47304…` on Base." Tap. Done.

What the receiver sees: a push notification — *"You received $20 USDC via Base."* The money is on Arc, ready to spend.

Behind the scenes glidepay:
1. **Detects** the incoming transfer via a Circle webhook.
2. **Tops up gas** on the source chain from a Glide-operated service wallet (so the user has zero ETH and doesn't care).
3. **Bridges** the USDC to Arc using Circle's **CCTP V2 Fast Transfer**.
4. **Notifies** the user with a single push and a `VIA BASE` badge in their Activity feed.

The sender doesn't know what Arc is. The receiver doesn't know a bridge happened. It just works.

**This is the Arc thesis as a product.** Arc is Circle's payment chain — fast, USDC-native, EVM-compatible. Universal Receive turns that thesis into a Cash App-feeling experience where Arc is the destination for all stablecoin payments, regardless of where the sender is.

---

## What you can do in the app

| Feature | What it does |
|---|---|
| **Send** | To `@username`, contact, or any wallet address. USDC or EURC. |
| **Receive** | One handle, five chains (Arc · Base · Ethereum · Polygon · Arbitrum). Anyone can pay you on whichever chain holds their USDC. |
| **Request** | Generate a payment link + QR for any amount and note. Share it. |
| **Swap** | USDC ↔ EURC ↔ cirBTC on Arc, powered by Circle App Kit. |
| **Bridge** | Send USDC from Arc out to other chains. |
| **Pay a request** | Receive a link, tap, confirm — done. |
| **Split a bill** | "Split $60 with @a @b @c" in the assistant — equal shares to each person. |
| **Scheduled sends** | Recurring weekly or monthly transfers (e.g. rent, allowance). |
| **Ask (Billy)** | The in-app AI agent. Conversational sends, requests, splits, swaps, bridges. |
| **Activity** | Filterable transaction history. Receipts with on-chain hash + explorer link. |
| **QR scan** | Camera viewfinder pays a wallet address or a request link. |
| **Push notifications** | Real-time alerts for incoming money, requests paid, swaps complete. |
| **Privacy** | Hide balance / blur activity amounts with one tap. |

---

## Why Arc?

[Arc](https://arc.network) is Circle's blockchain, built specifically for payments. It has three properties that make it the natural home for a Cash App-style product:

1. **USDC is gas.** Most chains use ETH or MATIC for gas, which means users need *two* tokens to do anything. On Arc, the dollar you hold is the dollar you spend. No confusing pre-funding.
2. **Sub-second finality.** Sending money on Arc feels instant — closer to swiping a debit card than waiting for a blockchain confirmation.
3. **Native CCTP support.** Arc is a first-class citizen on Circle's Cross-Chain Transfer Protocol, which is what makes Universal Receive possible without bespoke bridges.

glidepay is built to showcase what consumer-grade payments look like on infrastructure designed for them.

---

## How it works under the hood

```
┌─────────────────────────┐
│   User signs up with    │
│   email / Google        │
│   (Clerk handles it)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐         Wallets across:
│   Glide provisions a    │ ◄────── Arc, Base, Ethereum,
│   Circle SCA wallet     │         Polygon, Arbitrum
│   in the background     │         (one logical user identity)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   User picks a Glide    │
│   Tag (e.g. @khadee)    │  ←──── Pay them by username, never by address
└───────────┬─────────────┘
            │
            │  Someone sends USDC on Base ──┐
            │                               ▼
            │                  ┌──────────────────────────┐
            │                  │ Circle webhook fires →   │
            │                  │ Glide handler runs →     │
            │                  │  - tops up gas           │
            │                  │  - CCTP V2 sweep to Arc  │
            │                  │  - one push notification │
            │                  └──────────┬───────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│  User opens glidepay → sees "+$20 via Base" → tap pay   │
└─────────────────────────────────────────────────────────┘
```

The trick is that **glidepay operates everything server-side via Circle Developer-Controlled Wallets.** There is no browser wallet, no MetaMask, no private keys exposed to the client. The user signs in with Clerk; we hold the signing capability via Circle's API; every transaction is initiated server-side after auth and validation.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server routes + RSC + Vercel edge are perfect for this shape |
| Auth | **Clerk** | Email / Google in 3 lines, no rolling our own |
| Wallets | **Circle Developer-Controlled Wallets** | Server-side signing, multi-chain SCAs out of the box |
| Bridge | **Circle CCTP V2** (Fast Transfer) | Native USDC across chains in ~30 seconds, no wrapping |
| Swap | **Circle App Kit** | USDC ↔ EURC ↔ cirBTC on Arc |
| DB | **Postgres** (Supabase) + **Prisma** | Standard, boring, works |
| AI | **Groq** | Cheap, fast inference for the Billy assistant |
| Push | **Web Push** (VAPID) | PWA-native notifications, no Firebase dependency |
| UI | **Tailwind v4** + custom Material You-style tokens | Mobile-first, dark-first |
| Motion | **Framer Motion** + **Lenis** | Scoped smooth-scroll on onboarding, transform-only animations elsewhere |

---

## Getting started

```bash
git clone https://github.com/0xdopewilly/glide
cd glide
npm install
cp .env.example .env.local       # fill in secrets — see DEPLOY.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need accounts at:
- [Circle Console](https://console.circle.com) — for `CIRCLE_API_KEY`, `CIRCLE_KIT_KEY`, and `CIRCLE_ENTITY_SECRET`
- [Clerk](https://clerk.com) — for `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- [Supabase](https://supabase.com) — for `DATABASE_URL` and `DIRECT_URL`
- [Groq](https://console.groq.com) — for `GROQ_API_KEY`

Full env-var reference and production deploy notes: **[DEPLOY.md](./DEPLOY.md)**.

---

## Project structure

```
app/
├─ (app)/             ← authenticated shell (home, send, receive, swap, …)
├─ onboarding/        ← public, paginated intro
├─ sign-in / sign-up  ← Clerk pages with custom theming
└─ api/
   ├─ wallet/         ← balance + token reads
   ├─ send/           ← signed transfers
   ├─ swap/           ← Circle App Kit
   ├─ bridge/         ← outbound Arc → other chains
   ├─ webhooks/circle ← inbound USDC events (Universal Receive)
   ├─ receive/sweep   ← manual rescue sweep
   ├─ agent/          ← Billy (Groq)
   └─ admin/          ← one-time gas-wallet provision + drain tools

lib/
├─ users.ts           ← Clerk → Circle wallet provisioning
├─ wallet-service.ts  ← Circle wallet reads (balance, tokens)
├─ app-kit.ts         ← swap + bridge primitives
├─ cctp-receive.ts    ← Universal Receive orchestration (claim → sweep)
├─ gas-refill.ts      ← service-wallet ETH refill before each sweep
└─ push.ts            ← web push wiring

prisma/schema.prisma  ← User, Transaction, WalletAddress, PaymentRequest, etc.
```

---

## Roadmap

What's working, what's next:

- ✅ **Universal Receive** — Base, Ethereum, Polygon, Arbitrum → Arc
- ✅ **Auto gas refill** — users never fund native ETH/MATIC on source chains
- ✅ **Billy assistant** — conversational sends, splits, swaps via Groq
- ⏳ **Solana inbound** — same CCTP V2 trick, different SDK path
- ⏳ **NFC tap-to-pay** — real-world merchant checkout
- ⏳ **Scheduled / recurring sends** at scale
- ⏳ **Mainnet** — currently Arc Testnet end-to-end

---

## Built for the Arc team

This is a love letter to Arc. The whole thesis — *invisible, native, multi-chain stablecoin payments* — is the kind of product you can only build cleanly on a chain like Arc.

Try the live app, send yourself a few testnet dollars, and watch what consumer-grade crypto could feel like.

**[Open glidepay →](https://glide-arc.vercel.app)**
