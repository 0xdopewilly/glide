import { requireSessionUser, isAuthError } from "@/lib/api-auth";
import { createCircleClient } from "@/lib/circle";
import { gasWalletEnvVar } from "@/lib/gas-refill";
import { EXTERNAL_CHAINS, IS_MAINNET, type ExternalChainKey } from "@/lib/network";
import { createWalletOnChain } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Faucets for testnet gas wallets. On mainnet the service wallet is funded
 * with real native token (ETH, or POL on Polygon) from your own treasury. */
const TESTNET_FAUCETS: Record<ExternalChainKey, string> = {
  base: "https://www.alchemy.com/faucets/base-sepolia",
  ethereum: "https://www.alchemy.com/faucets/ethereum-sepolia",
  polygon: "https://www.alchemy.com/faucets/polygon-amoy",
  arbitrum: "https://www.alchemy.com/faucets/arbitrum-sepolia",
};

/** Gas service wallet chains for the active network, keyed by Circle id. */
const SUPPORTED: Record<string, { envVar: string; funding: string }> =
  Object.fromEntries(
    (Object.keys(EXTERNAL_CHAINS) as ExternalChainKey[]).map((key) => {
      const circleBlockchain = EXTERNAL_CHAINS[key].circleBlockchain;
      return [
        circleBlockchain,
        {
          envVar: gasWalletEnvVar(circleBlockchain),
          funding: IS_MAINNET
            ? `send real native gas token on ${EXTERNAL_CHAINS[key].label} mainnet`
            : `via faucet: ${TESTNET_FAUCETS[key]}`,
        },
      ];
    }),
  );

/** One-time admin tool: provisions a new Circle EOA on the given chain to
 * use as the Universal Receive gas service wallet. An EOA, not an SCA: it
 * only ever sends native gas, pays its own fees from that balance, and so
 * doesn't depend on a Gas Station policy for the chain. Returns the wallet id +
 * address. The id should be set as the matching env var on Vercel; the
 * address must be funded with native gas (faucet on testnet, real funds on
 * mainnet) so it can refill user
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

  const cfg = SUPPORTED[chain];

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

  const wallet = await createWalletOnChain(chain, "EOA");

  return NextResponse.json({
    chain,
    walletId: wallet.id,
    address: wallet.address,
    instructions: [
      `1. Set ${cfg.envVar}=${wallet.id} on Vercel (Production env).`,
      `2. Also set ${cfg.envVar}_ADDRESS=${wallet.address} so the drain endpoint can find it.`,
      `3. Fund ${wallet.address} on ${chain}: ${cfg.funding}`,
      `4. Redeploy. Universal Receive sweeps will now auto-refill user gas.`,
    ],
  });
}
