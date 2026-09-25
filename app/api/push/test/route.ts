import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { sendPushToUser } from "@/lib/push";
import { NextResponse } from "next/server";

/** POST — sends a test alert to the signed-in user's own devices, so they
 * can confirm payment alerts actually arrive (Settings → Payment alerts). */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const result = await sendPushToUser(session.userId, {
    title: "glidepay",
    body: "Payment alerts are on. You'll hear from us when money arrives.",
    url: "/",
  });
  if (result.devices === 0) {
    return NextResponse.json(
      { error: "Alerts aren't on for this device yet." },
      { status: 409 },
    );
  }
  if (result.sent === 0) {
    return NextResponse.json(
      { error: "Couldn't reach your device. Turn alerts off and on again." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
