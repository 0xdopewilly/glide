import { claimIncoming, completeSweep, isInboundUsdc } from "@/lib/cctp-receive";
import {
  getReceiveChainByCircleBlockchain,
  GLIDE_BLOCKCHAIN,
  RECEIVE_CHAINS,
} from "@/lib/circle";
import { syncCircleTransactionsToDb } from "@/lib/circle-transactions";
import { prisma } from "@/lib/db";
import { verifyCircleWebhook } from "@/lib/webhook-signature";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Circle notification webhook: Universal Receive sweeps, and instant alerts
 * for money arriving on Arc.
 *
 * Two-phase: (1) claim the event atomically via a unique-constrained
 * Transaction row, returning 200 to Circle in <1s so they don't retry; then
 * (2) run the actual CCTP bridge in the background via Next.js `after()`.
 * This decouples Circle's ~7s timeout from our 30–60s bridge call and makes
 * duplicate sweeps impossible (DB rejects parallel claims atomically).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Every request must carry a valid Circle signature. Without this anyone
  // could POST fake "inbound" events, creating phantom receipts and spending
  // gas-wallet funds on sweeps that can't succeed.
  const signed = await verifyCircleWebhook(
    rawBody,
    request.headers.get("x-circle-signature"),
    request.headers.get("x-circle-key-id"),
  );
  if (!signed) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  type NotificationBody = {
    notificationType?: string;
    notification?: {
      transactionType?: string;
      blockchain?: string;
      destinationAddress?: string;
      amounts?: string[];
      amount?: string;
      txHash?: string;
      state?: string;
      tokenId?: string;
    };
  };

  let payload: NotificationBody;
  try {
    payload = JSON.parse(rawBody) as NotificationBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const n = payload.notification;
  if (!n) {
    return NextResponse.json({ ok: true, ignored: "no notification body" });
  }
  if (n.transactionType && n.transactionType !== "INBOUND") {
    return NextResponse.json({
      ok: true,
      ignored: `transactionType=${n.transactionType}`,
    });
  }
  if (n.state && n.state !== "CONFIRMED" && n.state !== "COMPLETE") {
    return NextResponse.json({ ok: true, ignored: `state=${n.state}` });
  }

  const chain = n.blockchain;
  const destinationAddress = n.destinationAddress?.toLowerCase();
  const amount = n.amounts?.[0] ?? n.amount;
  const sourceTxHash = n.txHash;

  if (!chain || !destinationAddress || !amount || !sourceTxHash) {
    return NextResponse.json({
      ok: true,
      ignored: "missing required fields",
      seen: { chain, destinationAddress, amount, sourceTxHash },
    });
  }

  // Money arriving on Arc itself (from an exchange or any outside wallet):
  // sync that user's activity now, which records the payment, sends the
  // push alert and runs their auto-save rules — instead of waiting until
  // they next open the app. The sync only credits verified tokens, so
  // airdropped spam stays silent.
  if (chain === GLIDE_BLOCKCHAIN) {
    const owner = await prisma.user.findFirst({
      where: { circleWalletAddress: { equals: destinationAddress, mode: "insensitive" } },
      select: { id: true, circleWalletId: true },
    });
    if (!owner?.circleWalletId) {
      return NextResponse.json({ ok: true, ignored: "not a glidepay wallet" });
    }
    const { id: userId, circleWalletId } = owner;
    after(async () => {
      try {
        await syncCircleTransactionsToDb(userId, circleWalletId);
      } catch (err) {
        console.error("[Glide webhook] arc receive sync:", err);
      }
    });
    return NextResponse.json({ ok: true, status: "syncing" });
  }

  // Universal Receive sweeps USDC only. Circle notifies for any token that
  // lands on a receive address — on mainnet that includes airdropped spam
  // posing as "USDC" — so require the chain's real USDC contract.
  let isUsdc: boolean;
  try {
    isUsdc = await isInboundUsdc(n.tokenId, chain);
  } catch (err) {
    // Token lookup failed (Circle API hiccup): ask Circle to retry later.
    console.error("[Glide webhook] token lookup:", err);
    return NextResponse.json({ error: "token lookup failed" }, { status: 503 });
  }
  if (!isUsdc) {
    return NextResponse.json({ ok: true, ignored: "not USDC" });
  }

  // Dust stays on the source chain (visible on the Receive screen, where the
  // user can sweep once it adds up) — each sweep costs real gas on mainnet.
  const receiveKey = getReceiveChainByCircleBlockchain(chain);
  const minSweep = receiveKey ? RECEIVE_CHAINS[receiveKey].minSweepUsd : 0;
  if (!(parseFloat(amount) >= minSweep)) {
    return NextResponse.json({ ok: true, ignored: "below minimum sweep" });
  }

  // Phase 1 (sync): atomic claim. If another retry already claimed this
  // sourceTxHash, the DB unique constraint trips and we short-circuit.
  const claim = await claimIncoming({
    circleBlockchain: chain,
    destinationAddress,
    amount,
    sourceTxHash,
  });

  if (claim.status !== "claimed") {
    return NextResponse.json({ ok: true, status: claim.status });
  }

  // Phase 2 (async): the heavy CCTP bridge call. Returning 200 to Circle now
  // so they don't retry while we work.
  after(async () => {
    const result = await completeSweep({
      transactionId: claim.transactionId,
      userId: claim.userId,
      sourceNetwork: claim.sourceNetwork,
      sourceAddress: destinationAddress,
      arcAddress: claim.arcAddress,
      amount,
      chainLabel: claim.chainLabel,
    });
    if (result?.status === "failed") {
      console.error("[Glide webhook] sweep failed:", result);
    }
  });

  return NextResponse.json({ ok: true, status: "claimed" });
}
