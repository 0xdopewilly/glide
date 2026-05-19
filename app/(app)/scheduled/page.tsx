"use client";

import { PageHeader } from "@/components/page-header";
import { ScheduledTransfersCard } from "@/components/scheduled-transfers-card";
import { CalendarClock } from "lucide-react";

export default function ScheduledPage() {
  return (
    <>
      <PageHeader title="Scheduled" backHref="/payments" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <div className="mt-2 flex items-start gap-3 rounded-2xl p-4 glide-surface-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/20 text-violet-600 dark:from-violet-500/25 dark:to-indigo-500/30 dark:text-violet-300">
            <CalendarClock className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Recurring sends</p>
            <p className="mt-1 text-xs leading-relaxed glide-muted">
              Rent, allowances, and subscriptions — processed once per day on the
              server. Cancel anytime.
            </p>
          </div>
        </div>
        <ScheduledTransfersCard className="mt-5" />
      </div>
    </>
  );
}
