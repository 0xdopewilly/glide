import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { resolveRecipient } from "@/lib/resolve-recipient";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
} from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** GET ?q=... - verify recipient exists (wallet, @username, or contact). */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const raw = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ resolved: false, reason: "empty" });
  }

  if (isValidWalletAddress(raw)) {
    return NextResponse.json({
      resolved: true,
      source: "wallet",
      label: raw,
    });
  }

  const resolved = await resolveRecipient(session.userId, raw);
  if (resolved) {
    return NextResponse.json({
      resolved: true,
      source: resolved.source,
      label: resolved.label,
    });
  }

  const maybeUsername = normalizeUsername(raw);
  if (isValidUsername(maybeUsername)) {
    return NextResponse.json({
      resolved: false,
      reason: "username_not_found",
      message: `@${maybeUsername} isn't on Glide yet`,
    });
  }

  return NextResponse.json({
    resolved: false,
    reason: "not_found",
    message: "No contact with that name. Try wallet or @username.",
  });
}
