import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** Stored as data URL in Postgres — client compresses before upload. */
const MAX_AVATAR_BYTES = 1_500_000;

/** GET — current profile from Supabase */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, email: true, avatarUrl: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: user.displayName ?? session.displayName ?? "Guest",
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
}

/** PATCH { displayName?, email?, avatarUrl? } — persist profile */
export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    displayName?: string;
    email?: string;
    avatarUrl?: string | null;
  };

  const displayName = body.displayName?.trim();
  const email = body.email?.trim().toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  let avatarUrl: string | null | undefined;
  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl === null || body.avatarUrl === "") {
      avatarUrl = null;
    } else if (!body.avatarUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Avatar must be an image" }, { status: 400 });
    } else if (body.avatarUrl.length > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max ~1.5MB after compression)" },
        { status: 400 },
      );
    } else {
      avatarUrl = body.avatarUrl;
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(displayName !== undefined ? { displayName: displayName || null } : {}),
        ...(email ? { email } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      select: { displayName: true, email: true, avatarUrl: true },
    });

    return NextResponse.json({
      displayName: user.displayName ?? "Guest",
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error("[Glide] profile PATCH:", err);
    const message =
      err instanceof Error && err.message.includes("Unique constraint")
        ? "That email is already in use"
        : "Could not save profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
