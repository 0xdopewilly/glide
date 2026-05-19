import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

/** GET — inbox list; ?countOnly=1 for unread badge */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const countOnly = request.nextUrl.searchParams.get("countOnly") === "1";

  if (countOnly) {
    const unreadCount = await getUnreadNotificationCount(session.userId);
    return NextResponse.json({ unreadCount });
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(session.userId),
    getUnreadNotificationCount(session.userId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

/** PATCH { id } or { all: true } — mark read */
export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { id?: string; all?: boolean };

  if (body.all) {
    await markAllNotificationsRead(session.userId);
    return NextResponse.json({ ok: true, unreadCount: 0 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id or all is required" }, { status: 400 });
  }

  await markNotificationRead(id, session.userId);
  const unreadCount = await getUnreadNotificationCount(session.userId);
  return NextResponse.json({ ok: true, unreadCount });
}
