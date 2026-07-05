import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { listPendingApprovals } from "@/lib/approvals";
import { NextResponse } from "next/server";

/** GET - the user's pending approvals. */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  const pending = await listPendingApprovals(session.userId);
  return NextResponse.json({ pending });
}
