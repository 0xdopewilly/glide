import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getPinStatus } from "@/lib/pin";
import { NextResponse } from "next/server";

/** GET - whether the user has a PIN set, and any active lockout. */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  return NextResponse.json(await getPinStatus(session.userId));
}
