import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isUsernameAvailable } from "@/lib/usernames";
import { isValidUsername, normalizeUsername } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** POST { username } — claim handle once (onboarding). */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { username?: string };
  const username = normalizeUsername(body.username ?? "");

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 characters: letters, numbers, or _" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { username: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existing.username) {
    return NextResponse.json(
      { error: "You already have a username", username: existing.username },
      { status: 400 },
    );
  }

  if (!(await isUsernameAvailable(username))) {
    return NextResponse.json(
      { error: "That username is taken" },
      { status: 409 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { username },
      select: { username: true, displayName: true, email: true, avatarUrl: true },
    });

    return NextResponse.json({
      username: user.username,
      displayName: user.displayName ?? "Guest",
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error("[Glide] username POST:", err);
    return NextResponse.json(
      { error: "Could not save username" },
      { status: 400 },
    );
  }
}
