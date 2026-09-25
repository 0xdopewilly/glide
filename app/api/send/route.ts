import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { assertPinVerified } from "@/lib/pin";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import {
  addressesEqual,
  arcTokenAddressForSymbol,
  classifyArcToken,
  normalizeTokenSymbol,
} from "@/lib/tokens";
import { formatStableAmount, formatTokenUnits } from "@/lib/currency-format";
import { shortenAddress } from "@/lib/format";
import { prisma } from "@/lib/db";
import { findUserByWalletAddress } from "@/lib/usernames";
import { userOwnsWallet } from "@/lib/users";
import {
  formatResolvedRecipientLabel,
  resolveRecipient,
} from "@/lib/resolve-recipient";
import { parseMoneyAmount } from "@/lib/validation";
import { arcExplorerUrl, recordTransaction } from "@/lib/transactions-db";
import {
  assertSufficientBalance,
  fetchUnverifiedTokenHolding,
  fetchWalletBalance,
  fetchWalletById,
} from "@/lib/wallet-service";
import { settleSoon } from "@/lib/settlement";
import { after, NextRequest, NextResponse } from "next/server";

// Circle createTransaction is fast but the request+sync cycle plus push
// notifications can occasionally cross 10s. Be safe.
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

function precisionForToken(token: string): number {
  return token === "cirBTC" ? 8 : 2;
}

/** POST { walletId, destinationAddress, amount } */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const gate = await assertPinVerified(session.userId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Confirm with your PIN to continue.", code: gate.code },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    walletId?: string;
    destinationAddress?: string;
    amount?: string;
    token?: string;
    note?: string;
    requestCode?: string;
    idempotencyKey?: string;
    /** Contract address, for sending an unverified token (memes etc.). */
    tokenAddress?: string;
  };

  const walletId = body.walletId?.trim();
  const recipientRaw = body.destinationAddress?.trim();
  const amount = body.amount?.trim();
  const rawTokenAddress = body.tokenAddress?.trim().toLowerCase();
  if (rawTokenAddress && !ADDRESS_RE.test(rawTokenAddress)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  // A verified token's own address is just that token; any other address is
  // an unverified token, handled by its own path below.
  const verifiedByAddress = rawTokenAddress
    ? classifyArcToken({ tokenAddress: rawTokenAddress, isNative: false })
    : null;
  const unverifiedAddress =
    rawTokenAddress && !verifiedByAddress ? rawTokenAddress : undefined;
  const token = verifiedByAddress ?? normalizeTokenSymbol(body.token);
  const note = body.note?.trim().slice(0, 140) || undefined;
  const requestCode = body.requestCode?.trim().toLowerCase();
  const idempotencyKey = UUID_RE.test(body.idempotencyKey?.trim() ?? "")
    ? body.idempotencyKey!.trim()
    : undefined;

  if (!walletId || !recipientRaw || !amount) {
    return NextResponse.json(
      { error: "walletId, destinationAddress, and amount are required" },
      { status: 400 },
    );
  }

  const resolved = await resolveRecipient(session.userId, recipientRaw);
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "Recipient not found. Use a wallet address, @username, or a saved contact name.",
      },
      { status: 400 },
    );
  }

  const destinationAddress = resolved.address;

  if (unverifiedAddress) {
    return sendUnverifiedToken({
      userId: session.userId,
      walletId,
      destinationAddress,
      receipt: receiptLabels(resolved, destinationAddress),
      amount,
      tokenAddress: unverifiedAddress,
      note,
      idempotencyKey,
    });
  }

  const parsed = parseMoneyAmount(amount, {
    maxDecimals: precisionForToken(token),
  });
  if (parsed === null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const owns = await userOwnsWallet(session.userId, walletId);
  if (!owns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const initialized = createCircleClient();
  if ("error" in initialized) {
    return NextResponse.json({ error: initialized.error }, { status: 500 });
  }

  try {
    const wallet = await fetchWalletById(walletId);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (wallet.address.toLowerCase() === destinationAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot send to your own address" },
        { status: 400 },
      );
    }

    await assertSufficientBalance(walletId, parsed, token);

    // Idempotency: block a duplicate send with the same (recipient, amount,
    // token) within the last 10 seconds for this user. Catches accidental
    // double-taps, double-submits, and rapid retries after a transient
    // network blip. Real Transaction rows from successful sends live in the
    // DB, so we use them as the dedup source of truth.
    const formatted = parsed.toFixed(precisionForToken(token));
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recent = await prisma.transaction.findFirst({
      where: {
        userId: session.userId,
        kind: "send",
        amountLabel: `−${formatStableAmount(parsed, token)}`,
        createdAt: { gte: tenSecondsAgo },
        metadata: {
          path: ["recipientAddress"],
          equals: destinationAddress,
        },
      },
      select: { id: true, txHash: true, circleTransactionId: true, status: true },
    });
    if (recent) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        circleTransactionId: recent.circleTransactionId,
        txHash: recent.txHash,
        state: recent.status,
        amount: formatted,
        token,
      });
    }

    const res = await initialized.client.createTransaction({
      walletAddress: wallet.address,
      blockchain: GLIDE_BLOCKCHAIN,
      tokenAddress: arcTokenAddressForSymbol(token),
      destinationAddress,
      amount: [formatted],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
      // Client-supplied, one per intended payment: Circle dedupes on it, so
      // a retried request returns the original transfer instead of a second.
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    const circleId = res.data?.id;
    const state = res.data?.state;
    const txHash = (res.data as { txHash?: string } | undefined)?.txHash;

    const { recipientLabel, recipientReceiptLabel } = receiptLabels(
      resolved,
      destinationAddress,
    );

    await recordTransaction({
      userId: session.userId,
      kind: "send",
      title: `Sent to ${recipientLabel}`,
      amountLabel: `−${formatStableAmount(parsed, token)}`,
      variant: "debit",
      status: state,
      circleTransactionId: circleId,
      txHash,
      explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
      chain: GLIDE_BLOCKCHAIN,
      metadata: {
        ...(note ? { note } : {}),
        token,
        recipient: recipientReceiptLabel,
        recipientAddress: destinationAddress,
        ...(requestCode ? { requestCode } : {}),
      },
    });

    const recipientUser = await findUserByWalletAddress(destinationAddress);
    if (recipientUser?.id && recipientUser.id !== session.userId) {
      const creditLabel = `+${formatStableAmount(parsed, token)}`;
      const { notifyIncomingPayment } = await import("@/lib/push");
      // Resolve sender's label for the recipient's activity row.
      const sender = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { username: true, displayName: true },
      });
      const senderReceiptLabel = sender?.username
        ? `@${sender.username}`
        : sender?.displayName?.trim() ||
          session.displayName?.trim() ||
          shortenAddress(wallet.address, 6);
      const receiveRow = await recordTransaction({
        userId: recipientUser.id,
        kind: "receive",
        title: `Received from ${senderReceiptLabel}`,
        amountLabel: creditLabel,
        variant: "credit",
        status: state,
        txHash,
        explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
        chain: GLIDE_BLOCKCHAIN,
        metadata: {
          token,
          fromUserId: session.userId,
          sender: senderReceiptLabel,
          fromAddress: wallet.address,
        },
      });
      if (receiveRow.isNew) {
        void notifyIncomingPayment(
          recipientUser.id,
          creditLabel,
          receiveRow.row.id,
          wallet.address,
          token,
        ).catch((err) => console.error("[Glide] receive notify:", err));
      }
    }

    if (requestCode) {
      const { getPaymentRequestByCode, markPaymentRequestProcessing } =
        await import("@/lib/payment-requests");
      const req = await getPaymentRequestByCode(requestCode);
      // Only a payment that actually satisfies the request marks it paid: to
      // the requester's wallet, in the requested token, for at least the
      // requested amount. Anything else is just a send.
      const satisfies =
        req?.status === "pending" &&
        req.userId !== session.userId &&
        addressesEqual(req.user?.circleWalletAddress, destinationAddress) &&
        normalizeTokenSymbol(req.token) === token &&
        parsed >= Number(req.amount);
      // "Processing" until Circle settles the transfer; lib/settlement.ts then
      // marks it paid (and notifies the requester) or reopens it.
      const updated = satisfies
        ? await markPaymentRequestProcessing(requestCode, session.userId)
        : { count: 0 };
      if (updated.count > 0) {
        after(() => settleSoon(session.userId));
      }
    }

    const balance = await fetchWalletBalance(walletId);

    return NextResponse.json({
      transactionId: circleId,
      state,
      txHash,
      explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
      balance,
    });
  } catch (err) {
    console.error("[Glide] send:", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

type Resolved = NonNullable<Awaited<ReturnType<typeof resolveRecipient>>>;

function receiptLabels(resolved: Resolved, destinationAddress: string) {
  const recipientLabel = formatResolvedRecipientLabel(resolved);
  const recipientReceiptLabel =
    resolved.source === "username"
      ? `@${recipientLabel}`
      : resolved.source === "wallet"
        ? shortenAddress(destinationAddress, 6)
        : recipientLabel;
  return { recipientLabel, recipientReceiptLabel };
}

/** "0012.500" → "12.5", ".5" → "0.5": the exact amount string Circle gets. */
function canonicalDecimal(value: string): string {
  const [int = "", frac = ""] = value.replace(/,/g, "").trim().split(".");
  const i = int.replace(/^0+(?=\d)/, "") || "0";
  const f = frac.replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
}

/** Send an unverified Arc token (a meme, anything the wallet holds that isn't
 * USDC / EURC / cirBTC). Balance, decimals and symbol come from Circle by
 * contract address — never from the client. It can't pay a payment request,
 * and the recipient gets no mirror row or push: the token's name is
 * attacker-controlled text we won't put in someone's notifications. */
async function sendUnverifiedToken(input: {
  userId: string;
  walletId: string;
  destinationAddress: string;
  receipt: { recipientLabel: string; recipientReceiptLabel: string };
  amount: string;
  tokenAddress: string;
  note?: string;
  idempotencyKey?: string;
}) {
  const { userId, walletId, destinationAddress } = input;
  const owns = await userOwnsWallet(userId, walletId);
  if (!owns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const initialized = createCircleClient();
  if ("error" in initialized) {
    return NextResponse.json({ error: initialized.error }, { status: 500 });
  }

  try {
    const wallet = await fetchWalletById(walletId);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }
    if (wallet.address.toLowerCase() === destinationAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot send to your own address" },
        { status: 400 },
      );
    }

    const holding = await fetchUnverifiedTokenHolding(walletId, input.tokenAddress);
    if (!holding?.tokenAddress) {
      return NextResponse.json(
        { error: "You don't hold this token." },
        { status: 400 },
      );
    }
    const decimals = Math.min(Math.max(holding.decimals ?? 18, 0), 18);
    const parsed = parseMoneyAmount(input.amount, { maxDecimals: decimals });
    if (parsed === null) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (parsed > holding.amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${formatTokenUnits(holding.amount, holding.symbol, decimals)}.`,
        },
        { status: 400 },
      );
    }

    const amountString = canonicalDecimal(input.amount);
    const label = formatTokenUnits(parsed, holding.symbol, decimals);

    // Same double-tap guard as the verified path.
    const recent = await prisma.transaction.findFirst({
      where: {
        userId,
        kind: "send",
        amountLabel: `−${label}`,
        createdAt: { gte: new Date(Date.now() - 10_000) },
        metadata: { path: ["recipientAddress"], equals: destinationAddress },
      },
      select: { txHash: true, circleTransactionId: true, status: true },
    });
    if (recent) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        circleTransactionId: recent.circleTransactionId,
        txHash: recent.txHash,
        state: recent.status,
      });
    }

    const res = await initialized.client.createTransaction({
      walletAddress: wallet.address,
      blockchain: GLIDE_BLOCKCHAIN,
      tokenAddress: holding.tokenAddress,
      destinationAddress,
      amount: [amountString],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    const circleId = res.data?.id;
    const state = res.data?.state;
    const txHash = (res.data as { txHash?: string } | undefined)?.txHash;

    await recordTransaction({
      userId,
      kind: "send",
      title: `Sent to ${input.receipt.recipientLabel}`,
      amountLabel: `−${label}`,
      variant: "debit",
      status: state,
      circleTransactionId: circleId,
      txHash,
      explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
      chain: GLIDE_BLOCKCHAIN,
      metadata: {
        ...(input.note ? { note: input.note } : {}),
        token: holding.symbol,
        tokenAddress: holding.tokenAddress,
        unverified: true,
        recipient: input.receipt.recipientReceiptLabel,
        recipientAddress: destinationAddress,
      },
    });

    return NextResponse.json({
      transactionId: circleId,
      state,
      txHash,
      explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
      balance: await fetchWalletBalance(walletId),
    });
  } catch (err) {
    console.error("[Glide] send (unverified token):", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
