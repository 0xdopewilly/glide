# Clerk setup for Glide

**Production app URL:** https://glide-arc.vercel.app

## Why `glide-arc.vercel.app` stays "Pending"

Clerk **Production** with a **custom primary domain** needs **DNS records** you control (CNAME, etc.).

You **cannot** add those records on `*.vercel.app` — Vercel owns that namespace. So the domain will stay **Pending** forever if you set it as Primary in Production.

Official Clerk docs: [Deploy to Vercel](https://clerk.com/docs/deployments/deploy-to-vercel) — *"you cannot use a `*.vercel.app` domain for production"*.

---

## Recommended for Glide right now (testnet MVP)

Use Clerk **Development** instance with `glide-arc.vercel.app` as an **allowed app URL** (not Primary domain).

### 1. In Clerk Dashboard

1. Switch instance toggle to **Development** (top of dashboard).
2. **Configure → Domains**
   - **Remove** `glide-arc.vercel.app` as **Primary** (or leave it unset).
   - Under **Paths** / **Application URLs** (or **Allowed redirect URLs**), add:
     - `https://glide-arc.vercel.app`
3. **Configure → User & Authentication → Social connections → Google**
   - Leave **default** (no custom credentials) in Development — Google works out of the box.
4. **API Keys** — copy **Development** keys (`pk_test_…`, `sk_test_…`) and Frontend API URL (`https://….clerk.accounts.dev`).

### 2. On Vercel

Project → **Settings → Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` from Development |
| `CLERK_SECRET_KEY` | `sk_test_…` from Development |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | `https://dynamic-turkey-46.clerk.accounts.dev` (your dev Frontend API) |

Redeploy after changing keys.

### 3. Test

Open https://glide-arc.vercel.app/onboarding → Sign up → Email or Google.

---

## When you want real Clerk Production

You need a **domain you own** (e.g. `glide.money`, `useglide.com`):

1. Buy domain → point DNS to Vercel.
2. Add domain in Vercel project.
3. In Clerk **Production** → set that domain as Primary → add Clerk’s DNS records at your registrar.
4. Wait until status is **Active** (not Pending).
5. Put **Production** keys (`pk_live_…`, `sk_live_…`) on Vercel.
6. Configure **Google OAuth** (required in Production) — see below.

---

## Google OAuth in Clerk Production

Production does **not** use Clerk’s shared Google app. You must create your own.

### Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → create/select project.
2. **APIs & Services → OAuth consent screen** → configure (External, test users OK for now).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs** — paste exactly what Clerk shows, e.g.:

   ```
   https://glide-arc.vercel.app/__clerk/v1/oauth_callback
   ```

   (Use the copy button in Clerk; if you use a custom domain later, add that URI too.)

5. Copy **Client ID** and **Client secret** into Clerk → Google → **Use custom credentials**.

### Or skip Google for now

In Clerk Production → Google → **disable** sign-in with Google; use **Email** only until OAuth is configured.

---

## Quick decision

| Goal | What to do |
|------|------------|
| Ship on `glide-arc.vercel.app` this week | **Development** instance + test keys on Vercel |
| `Pending` on Primary domain | **Stop using** `vercel.app` as Primary; use dev instance OR buy a domain |
| Full production Clerk + Google | Custom domain + DNS + `pk_live_` keys + Google OAuth credentials |
