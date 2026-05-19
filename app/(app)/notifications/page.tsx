"use client";

import { NotificationsFeed } from "@/components/notifications-feed";
import { PageHeader } from "@/components/page-header";
import type { GlideNotification } from "@/lib/notifications";
import { useCallback, useEffect, useState } from "react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<GlideNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: GlideNotification[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  return (
    <>
      <PageHeader title="Notifications" backHref="/" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-sm glide-muted">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "Requests, payments, and updates"}
          </p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-sm font-semibold text-violet-600 dark:text-violet-400"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {loading ? (
          <ul className="mt-6 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-[72px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/[0.06]"
              />
            ))}
          </ul>
        ) : (
          <NotificationsFeed
            notifications={notifications}
            onMarkRead={(id) => void markRead(id)}
          />
        )}
      </div>
    </>
  );
}
