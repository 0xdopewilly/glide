"use client";

import { TransactionList } from "@/components/transaction-list";
import type { ActivityDateGroup } from "@/lib/activity";

export function ActivityFeed({
  groups,
  loading,
  emptyMessage,
}: {
  groups: ActivityDateGroup[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  if (loading && groups.length === 0) {
    return <TransactionList transactions={[]} loading />;
  }

  if (groups.length === 0) {
    return (
      <p className="mt-6 rounded-2xl px-4 py-12 text-center text-sm font-medium glide-muted glide-surface-card">
        {emptyMessage ?? "No activity matches these filters"}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-6 pb-2">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-2.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] glide-muted">
            {group.label}
          </h2>
          <TransactionList
            transactions={group.items}
            showTime
            grouped
          />
        </section>
      ))}
    </div>
  );
}
