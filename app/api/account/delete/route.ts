import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
 * What this does NOT do:
 *  - On-chain wallet balances live forever — those are public, immutable, and
 *    not ours to delete. The user keeps any USDC/EURC on their Circle wallet
 *    address; they just lose the glidepay-side link to it. If they sign up
 *    again with the same email, Clerk's a new user — they'll get a NEW wallet.
 *
 * Required by Apple Guideline 5.1.1(v) as of 2023 — apps that allow account
 * creation must allow account deletion in-app.
 */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

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
