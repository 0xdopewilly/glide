"use client";

import { headerIconButtonClassName } from "@/components/header-icon-button";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?countOnly=1");
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadCount();
    const id = window.setInterval(() => void loadCount(), 45_000);
    const onFocus = () => void loadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadCount]);

  const badge =
    unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null;

  return (
    <Link
      href="/notifications"
      className={`${headerIconButtonClassName()} relative`}
      aria-label={
        badge ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={2.25} />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-neutral-100 dark:ring-[#1c1c1e]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
