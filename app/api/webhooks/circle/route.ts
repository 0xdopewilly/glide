import { handleIncomingUsdc } from "@/lib/cctp-receive";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Circle notification webhook for Universal Receive.
 *
 * Circle's "Transactions Inbound" subscription fires here when USDC lands at
 * one of our per-chain receive wallets. We verify the HMAC signature, parse
 * the inbound USDC event, and trigger a CCTP V2 sweep into Arc.
 *
 * Configure in Circle Console:
 *  - Subscription endpoint: https://<host>/api/webhooks/circle
 *  - Subscribed event: transactions.inbound
 *  - Signing key → CIRCLE_NOTIFICATION_SIGNING_KEY env var
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
  if (!n || n.transactionType !== "INBOUND") {
    return NextResponse.json({ ok: true, ignored: "not inbound" });
  }
  if (n.state && n.state !== "CONFIRMED" && n.state !== "COMPLETE") {
    return NextResponse.json({ ok: true, ignored: `state=${n.state}` });
  }

  const chain = n.blockchain;
  const destinationAddress = n.destinationAddress?.toLowerCase();
  const amount = n.amounts?.[0] ?? n.amount;
  const sourceTxHash = n.txHash;

  if (!chain || !destinationAddress || !amount || !sourceTxHash) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 },
    );
  }

  const result = await handleIncomingUsdc({
    circleBlockchain: chain,
    destinationAddress,
    amount,
    sourceTxHash,
  });

  return NextResponse.json({ ok: true, ...result });
}
