import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** POST { endpoint, keys: { p256dh, auth } } */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.userId, endpoint, p256dh, auth },
    update: { userId: session.userId, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const endpoint = request.nextUrl.searchParams.get("endpoint")?.trim();
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.userId, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.userId },
    });
  }

  return NextResponse.json({ ok: true });
}
