import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { safeApiError } from "@/lib/circle";
import { syncCircleTransactionsToDb } from "@/lib/circle-transactions";
import { listUserTransactions } from "@/lib/transactions-db";
import { userOwnsWallet } from "@/lib/users";
import type { GlideTransaction } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function mergeTransactions(lists: GlideTransaction[][]): GlideTransaction[] {
  const seen = new Set<string>();
  const merged: GlideTransaction[] = [];

  for (const list of lists) {
    for (const tx of list) {
      const key = tx.txHash ?? tx.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(tx);
    }
  }

  return merged.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/** GET ?walletId= — on-chain activity from Circle, cached in Supabase */
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
    const fromDb = await listUserTransactions(session.userId);

    if (quick) {
      return NextResponse.json({ transactions: fromDb });
    }

    const fromCircle = await syncCircleTransactionsToDb(session.userId, walletId);
    const transactions = mergeTransactions([fromCircle, fromDb]);

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
