import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { withdrawFromSavings } from "@/lib/savings";
import { NextResponse } from "next/server";

/** POST { amount, token? } - move funds from Savings back to Spending. */
export async function POST(req: Request) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const amount =
    typeof b.amount === "string"
      ? b.amount
      : typeof b.amount === "number"
        ? String(b.amount)
        : "";
  const token = typeof b.token === "string" ? b.token : undefined;

  const result = await withdrawFromSavings(session.userId, { amount, token });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
