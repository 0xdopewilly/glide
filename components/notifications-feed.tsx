"use client";

import type { GlideNotification } from "@/lib/notifications";
import { notificationUiFor } from "@/lib/notification-ui";
import { formatRelativeDate } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

function groupByDate(items: GlideNotification[]) {
  const map = new Map<string, GlideNotification[]>();
  for (const item of items) {
    const key = formatRelativeDate(item.createdAt);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsFeed({
  notifications,
  onMarkRead,
}: {
  notifications: GlideNotification[];
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  if (notifications.length === 0) {
    return (
      <div className="mt-12 rounded-2xl border border-neutral-200/80 bg-white/80 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-base font-semibold tracking-tight">All caught up</p>
        <p className="mt-2 text-sm glide-muted">
          Payment requests and money you receive will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6 pb-4">
      {groups.map(([label, items]) => (
        <section key={label}>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-white/45">
            {label}
          </h2>
          <ul className="space-y-2">
            {items.map((n) => {
              const { Icon, accent } = notificationUiFor(n.type);

              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id);
                      if (n.url) router.push(n.url);
                    }}
                    className={`glide-tap flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                      n.read
                        ? "border-neutral-200/70 bg-white/60 dark:border-white/[0.06] dark:bg-white/[0.03]"
                        : "border-violet-200/80 bg-violet-50/80 dark:border-violet-500/25 dark:bg-violet-500/10"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold tracking-tight">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums glide-muted">
                          {formatTime(n.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug glide-muted">
                        {n.body}
                      </span>
                    </span>
                    {!n.read ? (
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
