import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { ARC_USDC_TOKEN_ADDRESS } from "@/lib/tokens";
import { userOwnsWallet } from "@/lib/users";
import { notifyPaymentSent } from "@/lib/push";
import {
  formatResolvedRecipientLabel,
  resolveRecipient,
} from "@/lib/resolve-recipient";
import { parseMoneyAmount } from "@/lib/validation";
import { arcExplorerUrl, recordTransaction } from "@/lib/transactions-db";
import {
  assertSufficientBalance,
  fetchWalletBalance,
  fetchWalletById,
} from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

/** POST { walletId, destinationAddress, amount } */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    walletId?: string;
    destinationAddress?: string;
    amount?: string;
  };

  const walletId = body.walletId?.trim();
  const recipientRaw = body.destinationAddress?.trim();
  const amount = body.amount?.trim();

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

  const parsed = parseMoneyAmount(amount);
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

    await assertSufficientBalance(walletId, parsed);

    const res = await initialized.client.createTransaction({
      walletAddress: wallet.address,
      blockchain: GLIDE_BLOCKCHAIN,
      tokenAddress: ARC_USDC_TOKEN_ADDRESS,
      destinationAddress,
      amount: [parsed.toFixed(2)],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    });

    const circleId = res.data?.id;
    const state = res.data?.state;
    const txHash = (res.data as { txHash?: string } | undefined)?.txHash;

    await recordTransaction({
      userId: session.userId,
      kind: "send",
      title: `Sent to ${formatResolvedRecipientLabel(resolved)}`,
      amountLabel: `−$${parsed.toFixed(2)}`,
      variant: "debit",
      status: state,
      circleTransactionId: circleId,
      txHash,
      explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
      chain: GLIDE_BLOCKCHAIN,
    });

    const balance = await fetchWalletBalance(walletId);

    void notifyPaymentSent(
      session.userId,
      parsed.toFixed(2),
      formatResolvedRecipientLabel(resolved),
    ).catch((err) => console.error("[Glide] send push:", err));

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
