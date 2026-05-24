import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createPaymentRequest, paymentRequestUrl } from "@/lib/payment-requests";
import { notifyPaymentRequest } from "@/lib/push";
import { normalizeTokenSymbol } from "@/lib/tokens";
import { findUserByEmail, findUserByUsername } from "@/lib/usernames";
import { isValidUsername, normalizeUsername, parseMoneyAmount } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** POST { amount, note?, glideTag?, email? } - create payment request */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    amount?: string;
    token?: string;
    note?: string;
    glideTag?: string;
    email?: string;
  };

  const parsed = parseMoneyAmount(body.amount?.trim() ?? "");
  if (parsed === null || parsed <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const glideTagRaw = body.glideTag?.trim().replace(/^@+/, "") ?? "";
  const emailRaw = body.email?.trim().toLowerCase() ?? "";

  let targetUserId: string | undefined;
  let requestFromGlideTag: string | undefined;
  let requestFromEmail: string | undefined;
  let targetLabel: string | undefined;

  if (glideTagRaw) {
    if (!isValidUsername(glideTagRaw)) {
      return NextResponse.json(
        { error: "Enter a valid Glide Tag (3–20 characters)" },
        { status: 400 },
      );
    }
    const tag = normalizeUsername(glideTagRaw);
    const user = await findUserByUsername(tag);
    if (!user) {
      return NextResponse.json(
        { error: `No Glide user found with tag ${tag}` },
        { status: 404 },
      );
    }
    if (user.id === session.userId) {
      return NextResponse.json(
        { error: "You cannot request money from yourself" },
        { status: 400 },
      );
    }
    targetUserId = user.id;
    requestFromGlideTag = tag;
    targetLabel = tag;
  } else if (emailRaw) {
    if (!emailRaw.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    requestFromEmail = emailRaw;
    const user = await findUserByEmail(emailRaw);
    if (user) {
      if (user.id === session.userId) {
        return NextResponse.json(
          { error: "You cannot request money from yourself" },
          { status: 400 },
        );
      }
      targetUserId = user.id;
      targetLabel = user.username || user.displayName || emailRaw;
    }
  }

  const requestToken = normalizeTokenSymbol(body.token);
  const decimals = requestToken === "cirBTC" ? 8 : 2;
  const row = await createPaymentRequest({
    userId: session.userId,
    amount: parsed.toFixed(decimals),
    token: body.token,
    note: body.note,
    targetUserId,
    requestFromEmail,
    requestFromGlideTag,
  });

  const origin = request.headers.get("origin") ?? undefined;
  const url = paymentRequestUrl(row.code, origin);
  const payPath = `/pay/${row.code}`;

  if (targetUserId && targetLabel) {
    const fromLabel =
      row.user.username ?? row.user.displayName ?? "Someone on Glide";
    void notifyPaymentRequest(
      targetUserId,
      row.amount,
      fromLabel,
      payPath,
      row.token,
    ).catch((err) => console.error("[Glide] request push:", err));
  }

  return NextResponse.json({
    code: row.code,
    amount: row.amount,
    token: row.token,
    note: row.note,
    url,
    glideTag: row.user.username,
    displayName: row.user.displayName,
    targetGlideTag: requestFromGlideTag,
    targetEmail: requestFromEmail,
    targetOnGlide: Boolean(targetUserId),
    targetLabel,
  });
}
