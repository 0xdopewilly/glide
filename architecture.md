# Glide: Project Architecture & Context

**For Cursor and contributors:** Read this document first so you understand the full scope, security model, user experience promises, and backend requirements of Glide.

---

## Wallet philosophy (no browser wallets)

Glide does **not** use MetaMask or any browser extension wallet. Downloading MetaMask would mean we failed the **“Invisible Crypto”** thesis.

**Wallet logic:** Use **Circle Developer-Controlled Wallets** (or a similar provider such as Privy or Dynamic). The user signs in with **email** or **passkey** (e.g. face / device biometrics). A **smart contract account (SCA)** is created and used **entirely in the background**. Users never see a seed phrase, “connect wallet,” or a generic “sign transaction” browser popup.

**Backend is mandatory:** The Circle Wallets integration is **server-side only**. Secrets **must not** ship to the client.

---

## 1. Project vision

Glide is an **“Invisible Crypto”** neo-bank on the **Arc Network**. It should feel like **Cash App** or **Venmo**, but runs on **USDC**, **sub-second deterministic finality**, and **account abstraction**. The UI is **hybrid**: traditional actions (**Send**, **Receive**, **Swap**, **Bridge**) plus an **AI Financial Operator** chat.

---

## 2. Core directives (STRICT)

| Rule | Detail |
|------|--------|
| **Zero crypto jargon** | Do not expose users to terms like “Gas,” “MetaMask,” “Tx Hash,” “Seed Phrase,” “Web3,” or “Connect Wallet” (unless the product name is unrelated—avoid entirely). |
| **Server-side security** | **Circle**, **Arc**, and **OpenAI** API keys and secrets (e.g. `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `OPENAI_API_KEY`) **MUST** live only on the server. Putting them in frontend code is an unacceptable security failure. |
| **USDC native** | Gas and value movement are accounted for in **USDC** on Arc, per network design. |

---

## 3. Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (App Router), Tailwind CSS, next-themes, Lucide icons |
| **Backend** | Next.js **API Routes** under `app/api/...` |
| **AI** | OpenAI API (**GPT-4o** or equivalent) to turn natural language into **structured JSON intents** |
| **Blockchain** | Arc **App Kit** (`@circle-fin/app-kit`), **Viem adapter** (`@circle-fin/adapter-viem-v2`), **Viem** (`viem`), **Developer-Controlled Wallets** (`@circle-fin/developer-controlled-wallets`) |

### Circle / Arc “Get Started” paths (which one is Glide?)

Arc’s console often lists **three** wallet modes. **Glide uses developer-controlled wallets** (you custody signing on the server for mainstream users). We do **not** use **user-controlled** wallets (end users hold signing keys). **Modular wallets** (client SDK + modules) is a different integration; we can add it later only if a feature explicitly requires Modular Wallets—core Glide flows stay **server-side DCW + API routes**.

### Installed npm SDKs (verify with `package.json`)

| Package | Role |
|---------|------|
| `@circle-fin/developer-controlled-wallets` | Server API client: wallet sets, SCAs on **ARC-TESTNET**, signing, transactions |
| `@circle-fin/app-kit` | Stablecoin **send / swap / bridge** orchestration (wired in API routes, not the browser) |
| `@circle-fin/adapter-viem-v2` | App Kit ↔ **Viem v2** EVM adapter |
| `viem` | EVM types, chains, utilities (explicit **peer** of the adapter; now a direct dependency) |

**Not installed on purpose:** browser “connect wallet” SDKs, MetaMask, and Modular Wallets client packages until the product calls for them.

> **Note:** Bump versions per [Circle](https://developers.circle.com) and Arc docs when you integrate; lockfile pins what shipped.

---

## 4. Wallet & execution flow

1. **User intent**  
   Example: the user types *“Send $10 to Bob”* in the chat box.

2. **Frontend → API**  
   The client sends the message to a **Next.js API route** (never with server secrets).

3. **Intent parsing**  
   The API calls **OpenAI** and receives structured JSON, e.g.  
   `{"action":"send","amount":"10","token":"USDC","recipient":"bob_address"}`  
   (exact schema TBD and validated server-side.)

4. **Execution**  
   The API uses **Circle Developer-Controlled Wallets** (via the **server-only** Circle adapter) to sign and submit. It invokes Arc App Kit operations such as `kit.send()` or `kit.swap()` as appropriate.

5. **Finality**  
   Arc confirms the operation quickly (sub-second finality). The API returns a **success** (or structured error) to the frontend; the UI updates without jargon-heavy receipts.

---

## 5. Why Next.js API routes

Because Glide uses **Next.js**, all privileged calls—**OpenAI**, **Circle**, **Arc App Kit**—go through **`app/api/...`**. The chat UI only talks to your own API; your server is the only place that holds keys and orchestrates money movement.
