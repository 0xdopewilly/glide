import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getSavingsSummary } from "@/lib/savings";
import { NextResponse } from "next/server";

/** GET - the user's Savings balance (USDC/EURC) and address. */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  return NextResponse.json(await getSavingsSummary(session.userId));
}
