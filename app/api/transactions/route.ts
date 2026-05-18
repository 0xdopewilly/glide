import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, safeApiError } from "@/lib/circle";
import { formatRelativeDate } from "@/lib/format";
import { userOwnsWallet } from "@/lib/users";
import type { GlideTransaction } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function mapCircleTransaction(tx: {
  id: string;
  state?: string;
  createDate?: string;
  amounts?: string[];
  destinationAddress?: string;
  transactionType?: string;
}): GlideTransaction {
  const amountRaw = tx.amounts?.[0] ?? "0";
  const amountNum = parseFloat(amountRaw);
  const isCredit = tx.transactionType?.toLowerCase().includes("inbound");

  return {
    id: tx.id,
    title: isCredit
      ? `Received`
      : tx.destinationAddress
        ? `Sent to ${tx.destinationAddress.slice(0, 6)}...${tx.destinationAddress.slice(-4)}`
        : "Transfer",
    amount: `${isCredit ? "+" : "−"}$${Math.abs(amountNum).toFixed(2)}`,
    variant: isCredit ? "credit" : "debit",
    meta: formatRelativeDate(tx.createDate),
    status: tx.state,
    kind: "send",
  };
}

/** GET ?walletId= — list transactions (must own wallet) */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const walletId = request.nextUrl.searchParams.get("walletId");
  if (!walletId) {
    return NextResponse.json({ error: "walletId is required" }, { status: 400 });
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
    const res = await initialized.client.listTransactions({
      walletIds: [walletId],
      pageSize: 25,
    });
    const transactions =
      res.data?.transactions?.map((tx) =>
        mapCircleTransaction({
          id: tx.id,
          state: tx.state,
          createDate: tx.createDate,
          amounts: tx.amounts,
          destinationAddress: tx.destinationAddress,
          transactionType: tx.transactionType,
        }),
      ) ?? [];

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[Glide] transactions GET:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
