import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { isUsernameAvailable } from "@/lib/usernames";
import { isValidUsername, normalizeUsername } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** GET ?u=khadee — is this Glide username available? */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const username = normalizeUsername(raw);

  if (!isValidUsername(username)) {
    return NextResponse.json({
      username,
      available: false,
      reason: "Use 3–20 letters, numbers, or underscores.",
    });
  }

  const available = await isUsernameAvailable(username);
  return NextResponse.json({ username, available });
}
