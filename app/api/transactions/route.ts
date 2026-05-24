import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { safeApiError } from "@/lib/circle";
import { syncCircleTransactionsToDb } from "@/lib/circle-transactions";
import { listUserTransactions } from "@/lib/transactions-db";
import { userOwnsWallet } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

/** GET ?walletId= - on-chain activity from Circle, cached in Supabase */
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

  const quick = request.nextUrl.searchParams.get("quick") === "1";

  try {
    if (quick) {
      const fromDb = await listUserTransactions(session.userId);
      return NextResponse.json({ transactions: fromDb });
    }

    // Sync persists fresh data (and heals broken rows), then read back from DB
    // so the response includes the latest healed labels and metadata-derived
    // counterparty fields. Reading from DB beats merging with Circle's mapped
    // values, which lack counterparty info.
    await syncCircleTransactionsToDb(session.userId, walletId);
    const transactions = await listUserTransactions(session.userId);

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[Glide] transactions GET:", err);
    try {
      const fromDb = await listUserTransactions(session.userId);
      if (fromDb.length > 0) {
        return NextResponse.json({ transactions: fromDb });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
