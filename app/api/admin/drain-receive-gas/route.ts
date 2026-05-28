import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, safeApiError } from "@/lib/circle";
import { prisma } from "@/lib/db";
import {
  createPublicClient,
  formatEther,
  http,
  parseEther,
  type Address,
} from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DRAIN_CHAINS = {
  base: {
    circleBlockchain: "BASE-SEPOLIA",
    chain: baseSepolia,
    serviceWalletAddressEnv: "GLIDE_GAS_WALLET_BASE_SEPOLIA_ADDRESS",
    /** Leave this much native ETH behind so the drain tx itself has gas.
     * Below the 0.00005 refill threshold so the auto-refill code path still
     * fires on the next sweep test. */
    dustEth: "0.00003",
  },
  ethereum: {
    circleBlockchain: "ETH-SEPOLIA",
    chain: sepolia,
    serviceWalletAddressEnv: "GLIDE_GAS_WALLET_ETH_SEPOLIA_ADDRESS",
    /** Larger dust on L1 - Ethereum gas is heavier. Sits below the 0.0008
     * refill threshold so the next sweep triggers the auto-refill path. */
    dustEth: "0.0004",
  },
} as const;

/** One-shot debug tool: drains your Base receive wallet's native ETH back to
 * the gas service wallet so you can prove the auto-refill code path fires on
 * the next sweep. Admin-gated. */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const adminId = process.env.GLIDE_ADMIN_USER_ID?.trim();
  if (!adminId || session.userId !== adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    chain?: string;
    destinationAddress?: string;
  };
  const chainKey = body.chain ?? "base";
  if (!(chainKey in DRAIN_CHAINS)) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }
  const cfg = DRAIN_CHAINS[chainKey as keyof typeof DRAIN_CHAINS];

  // Find the caller's receive wallet on this chain.
  const wallet = await prisma.walletAddress.findUnique({
    where: {
      userId_chain: {
        userId: session.userId,
        chain: cfg.circleBlockchain,
      },
    },
  });
  if (!wallet) {
    return NextResponse.json(
      { error: "No receive wallet on this chain" },
      { status: 404 },
    );
  }

  // Where to drain to: prefer the gas service wallet address (env-provided
  // so we don't have to look it up via Circle every time). Fallback: caller
  // provides destinationAddress in body.
  const destEnv = process.env[cfg.serviceWalletAddressEnv]?.trim();
  const destination = destEnv || body.destinationAddress;
  if (!destination) {
    return NextResponse.json(
      {
        error: "No destination",
        hint: `Set ${cfg.serviceWalletAddressEnv} on Vercel (gas service wallet address) or pass destinationAddress in body.`,
      },
      { status: 400 },
    );
  }

  // Read current native balance.
  const publicClient = createPublicClient({
    chain: cfg.chain,
    transport: http(),
  });
  const balanceWei = await publicClient.getBalance({
    address: wallet.address as Address,
  });
  const dustWei = parseEther(cfg.dustEth);
  if (balanceWei <= dustWei) {
    return NextResponse.json({
      status: "already_low",
      balance: formatEther(balanceWei),
      threshold: cfg.dustEth,
    });
  }
  const sendWei = balanceWei - dustWei;
  const sendEth = formatEther(sendWei);

  const initialized = createCircleClient();
  if ("error" in initialized) {
    return NextResponse.json({ error: initialized.error }, { status: 500 });
  }

  // Resolve the native token id for this wallet by listing balances and
  // picking the entry without a tokenAddress (native chain token).
  const balances = await initialized.client.getWalletTokenBalance({
    id: wallet.walletId,
  });
  const native = balances.data?.tokenBalances?.find((b) => {
    const addr = b.token?.tokenAddress;
    return !addr || addr === "";
  });
  const nativeTokenId = native?.token?.id;
  if (!nativeTokenId) {
    return NextResponse.json(
      { error: "Could not resolve native token id for this wallet" },
      { status: 500 },
    );
  }

  try {
    const transfer = await initialized.client.createTransaction({
      walletId: wallet.walletId,
      destinationAddress: destination,
      amount: [sendEth],
      tokenId: nativeTokenId,
      fee: {
        type: "level",
        config: { feeLevel: "HIGH" },
      },
    });
    return NextResponse.json({
      status: "drain_submitted",
      circleTransactionId: transfer.data?.id ?? null,
      from: wallet.address,
      to: destination,
      sentEth: sendEth,
      leftoverEth: cfg.dustEth,
      hint: "Tx will land in ~10s. Run again with a fresh sweep to verify auto-refill fires.",
    });
  } catch (err) {
    console.error("[Glide] drain:", err);
    return NextResponse.json(
      { error: safeApiError(err) },
      { status: 502 },
    );
  }
}
