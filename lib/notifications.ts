import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type NotificationType =
  | "payment_received"
  | "payment_request"
  | "payment_sent"
  | "request_paid"
  | "swap_complete"
  | "bridge_complete";

export type GlideNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<GlideNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    url: row.url,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
