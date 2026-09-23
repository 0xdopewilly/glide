import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { externalUsdcAddress } from "@/lib/chain-balances";
import { getReceiveChainByCircleBlockchain, RECEIVE_CHAINS } from "@/lib/circle";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { assertPinVerified } from "@/lib/pin";
import {
  fetchUsdcBalanceAnyChain,
  fetchWalletTokenBalances,
} from "@/lib/wallet-service";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Smallest balance that blocks deletion (dust below this is ignored). */
function blocks(symbol: string, amount: number): boolean {
  return symbol === "cirBTC" ? amount >= 0.000001 : amount >= 0.01;
}

/** Everything the user still holds across Spending, Savings and every
 * Universal Receive address. Throws if any balance can't be read — deletion
 * is irreversible, so it must fail closed. */
async function remainingBalances(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { circleWalletId: true, savingsWalletId: true },
  });
  const receive = await prisma.walletAddress.findMany({
    where: { userId },
    select: { chain: true, walletId: true },
  });
  const found: string[] = [];
  const wallets = [
    { id: user?.circleWalletId, label: "Spending" },
    { id: user?.savingsWalletId, label: "Savings" },
  ];
  await Promise.all([
    ...wallets.map(async (w) => {
      if (!w.id) return;
      for (const t of await fetchWalletTokenBalances(w.id)) {
        if (blocks(t.symbol, t.amount)) {
          found.push(`${formatStableAmount(t.amount, t.symbol)} in ${w.label}`);
        }
      }
    }),
    ...receive.map(async (r) => {
      const key = getReceiveChainByCircleBlockchain(r.chain);
      if (!key) return;
      const amount = await fetchUsdcBalanceAnyChain(r.walletId, externalUsdcAddress(key));
      if (blocks("USDC", amount)) {
        found.push(`${formatStableAmount(amount, "USDC")} waiting on ${RECEIVE_CHAINS[key].label}`);
      }
    }),
  ]);
  return found;
}

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST — permanently delete the caller's glidepay account.
 *
 * What this does:
 *  - Deletes the User row in our Postgres. All related rows cascade-delete via
 *    the schema (transactions, contacts, push subscriptions, payment requests,
 *    scheduled transfers, notifications, wallet addresses, chat history).
 *  - Deletes the Clerk user so the email can re-register fresh later.
 *
 * Guarded: needs the PIN, and every glidepay wallet must be empty — with
 * developer-controlled wallets nobody could move leftover funds afterwards.
 * If they sign up again with the same email, Clerk makes a new user — they
 * get a NEW wallet.
 *
 * Required by Apple Guideline 5.1.1(v) as of 2023 — apps that allow account
 * creation must allow account deletion in-app.
 */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const gate = await assertPinVerified(session.userId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Confirm with your PIN to continue.", code: gate.code },
      { status: 401 },
    );
  }

  // With developer-controlled wallets, nobody can move funds once the
  // account is gone — so the account must be empty first.
  let remaining: string[];
  try {
    remaining = await remainingBalances(session.userId);
  } catch (err) {
    console.error("[Glide] account delete (balances):", err);
    return NextResponse.json(
      { error: "We couldn't check your balances. Try again in a moment." },
      { status: 503 },
    );
  }
  if (remaining.length > 0) {
    return NextResponse.json(
      {
        error: `Move your money out first: ${remaining.join(", ")}. Your account can be deleted once it's empty.`,
        remaining,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: session.userId } });
  } catch (err) {
    console.error("[Glide] account delete (prisma):", err);
    // Continue anyway - if the DB row is already gone we still want to delete
    // the Clerk user so the email isn't stuck in limbo.
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(session.userId);
  } catch (err) {
    console.error("[Glide] account delete (clerk):", err);
    return NextResponse.json(
      {
        error:
          "Your data was removed from glidepay but the auth account couldn't be deleted. Contact support and we'll finish it manually.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
