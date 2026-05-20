import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getPaymentRequestByCode } from "@/lib/payment-requests";
import { NextRequest, NextResponse } from "next/server";

/** GET — public payment request details (auth required to pay) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const row = await getPaymentRequestByCode(code);
  if (!row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json({
    code: row.code,
    amount: row.amount,
    token: row.token,
    note: row.note,
    status: row.status,
    requester: {
      username: row.user.username,
      displayName: row.user.displayName,
    },
    payTo:
      row.user.username != null
        ? `@${row.user.username}`
        : row.user.circleWalletAddress,
  });
}

/** POST — mark request paid after successful send */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const { code } = await params;
  const row = await getPaymentRequestByCode(code);
  if (!row || row.status !== "pending") {
    return NextResponse.json({ error: "Request not available" }, { status: 404 });
  }

  const { markPaymentRequestPaid } = await import("@/lib/payment-requests");
  await markPaymentRequestPaid(code, session.userId);

  return NextResponse.json({ ok: true });
}
