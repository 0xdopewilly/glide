import { requireSessionUser, isAuthError } from "@/lib/api-auth";
import { createCircleClient } from "@/lib/circle";
import { createWalletOnChain } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPPORTED = {
  "BASE-SEPOLIA": {
    envVar: "GLIDE_GAS_WALLET_BASE_SEPOLIA",
    faucet: "https://www.alchemy.com/faucets/base-sepolia",
  },
  "ETH-SEPOLIA": {
    envVar: "GLIDE_GAS_WALLET_ETH_SEPOLIA",
    faucet: "https://www.alchemy.com/faucets/ethereum-sepolia",
  },
  "MATIC-AMOY": {
    envVar: "GLIDE_GAS_WALLET_MATIC_AMOY",
    faucet: "https://www.alchemy.com/faucets/polygon-amoy",
  },
  "ARB-SEPOLIA": {
    envVar: "GLIDE_GAS_WALLET_ARB_SEPOLIA",
    faucet: "https://www.alchemy.com/faucets/arbitrum-sepolia",
  },
} as const;

/** One-time admin tool: provisions a new Circle SCA on the given chain to
 * use as the Universal Receive gas service wallet. Returns the wallet id +
 * address. The id should be set as the matching env var on Vercel; the
 * address must be funded from a testnet ETH faucet so it can refill user
 * wallets before each sweep. Gated by GLIDE_ADMIN_USER_ID for safety. */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const adminId = process.env.GLIDE_ADMIN_USER_ID?.trim();
  if (!adminId || session.userId !== adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { chain?: string };
  const chain = body.chain?.trim();
  if (!chain || !(chain in SUPPORTED)) {
    return NextResponse.json(
      {
        error: "Unsupported chain",
        supported: Object.keys(SUPPORTED),
      },
      { status: 400 },
    );
  }

  const cfg = SUPPORTED[chain as keyof typeof SUPPORTED];

  // Idempotency: if a gas wallet is already configured via env var, return
  // *that* one instead of provisioning a new wallet. Without this, repeated
  // calls (e.g. when the operator forgets they already ran it) wastefully
  // spawn fresh Circle wallets and risk pointing env vars at unfunded ones.
  const existingId = process.env[cfg.envVar]?.trim();
  if (existingId) {
    const initialized = createCircleClient();
    if (!("error" in initialized)) {
      try {
        const res = await initialized.client.getWallet({ id: existingId });
        const w = res.data?.wallet;
        if (w?.id && w?.address) {
          return NextResponse.json({
            chain,
            walletId: w.id,
            address: w.address,
            existing: true,
            note: `Returning the wallet already configured via ${cfg.envVar}. No new wallet was created.`,
          });
        }
      } catch {
        // env points to a stale id; fall through to create a new wallet
      }
    }
  }

  const wallet = await createWalletOnChain(chain);

  return NextResponse.json({
    chain,
    walletId: wallet.id,
    address: wallet.address,
    instructions: [
      `1. Set ${cfg.envVar}=${wallet.id} on Vercel (Production env).`,
      `2. Also set ${cfg.envVar}_ADDRESS=${wallet.address} so the drain endpoint can find it.`,
      `3. Fund ${wallet.address} on ${chain} via faucet: ${cfg.faucet}`,
      `4. Redeploy. Universal Receive sweeps will now auto-refill user gas.`,
    ],
  });
}
