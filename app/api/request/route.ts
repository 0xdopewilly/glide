import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createPaymentRequest, paymentRequestUrl } from "@/lib/payment-requests";
import { parseMoneyAmount } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** POST { amount, note? } — create shareable payment request */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { amount?: string; note?: string };
  const parsed = parseMoneyAmount(body.amount?.trim() ?? "");
  if (parsed === null || parsed <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const row = await createPaymentRequest({
    userId: session.userId,
    amount: parsed.toFixed(2),
    note: body.note,
  });

  const origin = request.headers.get("origin") ?? undefined;
  const url = paymentRequestUrl(row.code, origin);

  return NextResponse.json({
    code: row.code,
    amount: row.amount,
    note: row.note,
    url,
    username: row.user.username,
    displayName: row.user.displayName,
  });
}
