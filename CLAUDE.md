# Claude Code — Glide project instructions

**Read this entire file before changing anything.** When anything is unclear, **stop and ask the user** — do not guess, infer missing requirements, or hallucinate APIs/files that are not in the repo.

---

## 0. Non‑negotiable behavior

1. **Ask before acting** if you are not sure about:
   - product intent (UX copy, flows, naming)
   - which token/network (USDC vs EURC, Arc testnet only)
   - whether to commit, push, or deploy
   - breaking changes to auth, wallet, or payments
   - re‑introducing animations or visual effects

2. **Verify in the codebase** before claiming something exists:
   - Read the file. Grep for usages. Run `npx tsc --noEmit` after TS changes.
   - Do **not** cite Circle/Clerk/Arc APIs from memory — check `package.json`, existing routes, and working call sites.

3. **Minimize scope.** Fix only what was requested. Match existing patterns in neighboring files.

4. **Never commit** unless the user explicitly asks. Never commit `.env.local`, `ideas`, or secrets.

5. **Never** put `CIRCLE_*`, `CLERK_*`, `GROQ_*`, or DB URLs in client code.

6. **Do not** add MetaMask, browser wallets, seed phrases, or “Connect Wallet” UX — see `architecture.md`.

---

## 1. What this app is

**Glide** (working name — user may rebrand; “Glide” as a product name may be taken) is a **mobile-first stablecoin wallet** on **Arc testnet**, styled like **Cash App / Venmo**.

- **Live:** https://glide-arc.vercel.app  
- **Repo:** https://github.com/0xdopewilly/glide  
- **Chain:** Arc testnet (USDC gas, USDC + EURC balances)  
- **Wallets:** Circle **Developer-Controlled Wallets** (server-side signing only)  
- **Auth:** Clerk (email / Google); unauthenticated `/` → `/onboarding`  
- **AI:** Groq assistant on `/ask` — structured JSON intents, **in-chat execution** (do not redirect to `/request` for money requests the agent can complete)

**Product thesis:** “Invisible crypto” — no jargon, no seed phrases, pay by `@username`.

---

## 2. Read these files first

| Priority | File | Why |
|----------|------|-----|
| 1 | `architecture.md` | Wallet philosophy, security, stack |
| 2 | `DEPLOY.md` | Vercel env vars, migrations, Clerk notes |
| 3 | `app/globals.css` | Material You tokens (`--glide-*`), motion rules |
| 4 | `context/wallet-context.tsx` | Balance, send, refresh — hot path for perf |
| 5 | `lib/agent-intents.ts` + `app/api/agent/route.ts` | AI intent schema & execution |
| 6 | `proxy.ts` | Auth routing (Clerk middleware) |
| 7 | `prisma/schema.prisma` | DB models (`PaymentRequest.token`, etc.) |

Some docs are stale (e.g. `README.md` still mentions Framer tab slides; `architecture.md` mentions OpenAI but **production uses Groq**). **Trust the code** over old markdown.

---

## 3. Stack (actual, from code)

- **Next.js 16** App Router — `app/(app)/` = authenticated shell  
- **Tailwind v4** — tokens in `app/globals.css`, utilities like `glide-tonal-card`, `glide-m3-nav`  
- **Clerk** — `components/clerk-auth-form.tsx` + `lib/clerk-appearance.ts` (theme-aware light/dark)  
- **Prisma + Postgres** (Supabase) — `npm run build` runs `prisma migrate deploy`  
- **Circle** — send/swap/bridge via API routes + App Kit  
- **Groq** — `app/api/agent/route.ts`  
- **Web push** — `lib/push.ts`

---

## 4. UX & design system

- **Material You–inspired** tokens in `:root` / `.dark` — not MUI.  
- **Light + dark** must both work (especially Clerk sign-in/sign-up and OTP fields).  
- **Bottom nav:** full-width Cash App style — `components/bottom-nav.tsx`  
- **Shell:** `components/app-shell.tsx` + static gradient `components/glide-gradient.tsx` (`glide-bg-wash` in CSS)

### Motion / performance (critical — user is very sensitive to jank)

**Current policy (as of commit `82499cc`):**

- Tab navigation is **instant** — `app/(app)/template.tsx` is a **passthrough** (no `key={pathname}`, no enter animation).  
- **Do not** re-add full-page slides, `AnimatePresence` tab pairs, `layoutId` nav pills, or `filter: blur()` animation layers without **asking the user first**.  
- If adding motion: **only** `transform` + `opacity` (`translate3d`), CSS-first, no remount keys on route wrappers.  
- Avoid `backdrop-filter` on hot paths (Android lag).  
- Avoid animating `width`, `height`, `top`, `left`, or `filter`.  
- `glide-tap` = scale-only press feedback.

**Known perf debt:** `WalletProvider` causes broad re-renders; `UsernameGate` subscribes to full wallet context. Split contexts only if user asks.

---

## 5. Features that exist (don’t re‑implement blindly)

| Feature | Entry | Notes |
|---------|-------|-------|
| Send | `/send` | USDC + EURC via `token` param; `@username`, contact, `0x` |
| Request | `/request` | USDC/EURC segment; link + QR |
| Pay request | `/pay/[code]` | Passes `token` to send flow |
| Ask / agent | `/ask` | Completes send, request, split, swap, bridge in chat |
| Split bill | Agent | `split $60 with @a @b` — equal shares, EURC supported |
| Swap / bridge | `/swap`, `/bridge` | Circle App Kit |
| Activity | `/activity` | Filters; expandable rows (no height animation) |
| Push | Server | USDC **and** EURC receive notifications |
| Onboarding | `/onboarding` | Material You; `/` redirects here when logged out |

**Agent request flow:** must call `/api/request` in chat — **never** `navigate` to `/request` for “request $X from @user”. See `lib/agent-intents.ts` reconcile rules.

---

## 6. Auth & routing

- `proxy.ts` — Clerk middleware; manual redirects (avoid `auth.protect()` issues on Next 16).  
- Public: `/onboarding`, `/sign-in`, `/sign-up`, health routes.  
- After sign-up → `/setup-username` (Glide Tag).  
- `ClerkProvider` `afterSignOutUrl="/onboarding"`.

---

## 7. Env & deploy

- Local: `.env.local` (never commit). See `DEPLOY.md` for full list.  
- **Required for migrations:** `DATABASE_URL` + `DIRECT_URL` on Vercel.  
- Build: `prisma migrate deploy && next build`  
- Do **not** push or deploy unless user asks.

---

## 8. Git conventions

- Concise commit messages; focus on **why**.  
- User pushes to `main` for Vercel.  
- Do not amend pushed commits unless user asks.

---

## 9. Before you say “done”

- [ ] `npx tsc --noEmit` passes  
- [ ] Changes match existing code style in touched files  
- [ ] Light **and** dark checked for UI/auth changes  
- [ ] No secrets in diff  
- [ ] You did **not** expand scope beyond the task  
- [ ] If you skipped something ambiguous, you **asked** the user

---

## 10. Open / user priorities (ask before assuming)

- **Product rename** — “Glide” may change; don’t hard-code brand in external copy without confirming.  
- **Animation feel** — user wants **fluid, snappy** UX (like their other apps), not forced micro-animations. Confirm before adding motion.  
- **README** — may be outdated; update only if user asks.  
- **`ideas`** file — local notes, not in git.

---

## 11. How to ask the user (examples)

Use short, specific questions:

- “Should request links default to USDC or remember last token?”  
- “You asked for animations — do you want **zero** tab motion (current) or a **subtle 8px** CSS slide?”  
- “This requires a Prisma migration on production — OK to add?”  
- “Commit and push to `main`, or local only?”

**When in doubt, ask. Do not ship a guess.**
