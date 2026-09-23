import { getPaymentRequestByCode } from "@/lib/payment-requests";
import { NextRequest, NextResponse } from "next/server";

/** GET - public payment request details (auth required to pay) */
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
