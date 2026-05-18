import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** GET — current profile from Supabase */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: user.displayName ?? session.displayName ?? "Guest",
    email: user.email,
  });
}

/** PATCH { displayName?, email? } — persist profile to Supabase */
export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    displayName?: string;
    email?: string;
  };

  const displayName = body.displayName?.trim();
  const email = body.email?.trim().toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(displayName !== undefined ? { displayName: displayName || null } : {}),
        ...(email ? { email } : {}),
      },
      select: { displayName: true, email: true },
    });

    return NextResponse.json({
      displayName: user.displayName ?? "Guest",
      email: user.email,
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
