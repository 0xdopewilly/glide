import { claimIncoming, completeSweep } from "@/lib/cctp-receive";
import crypto from "node:crypto";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Circle notification webhook for Universal Receive.
 *
 * Two-phase: (1) claim the event atomically via a unique-constrained
 * Transaction row, returning 200 to Circle in <1s so they don't retry; then
 * (2) run the actual CCTP bridge in the background via Next.js `after()`.
 * This decouples Circle's ~7s timeout from our 30–60s bridge call and makes
 * duplicate sweeps impossible (DB rejects parallel claims atomically).
 */
export async function POST(request: NextRequest) {
  const signingKey = process.env.CIRCLE_NOTIFICATION_SIGNING_KEY?.trim();
  const rawBody = await request.text();

  if (signingKey) {
    const provided =
      request.headers.get("x-circle-signature") ??
      request.headers.get("circle-signature") ??
      "";
    const expected = crypto
      .createHmac("sha256", signingKey)
      .update(rawBody)
      .digest("hex");

    const ok =
      provided.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
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
    if (result?.status !== "swept") {
      console.error("[Glide webhook] sweep failed:", result);
    }
  });

  return NextResponse.json({ ok: true, status: "claimed" });
}
