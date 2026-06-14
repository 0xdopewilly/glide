"use client";

import { PageHeader } from "@/components/page-header";
import { ScheduledTransfersCard } from "@/components/scheduled-transfers-card";
import { CalendarClock } from "lucide-react";

export default function ScheduledPage() {
  return (
    <>
      <PageHeader title="Scheduled" backHref="/payments" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <div
          className="slide-up-bouncy mt-2 flex items-start gap-3 rounded-3xl border p-4"
          style={{
            background: "var(--glide-surface-elevated)",
            borderColor: "var(--glide-elevated-border)",
          }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "var(--glide-accent)",
              color: "var(--glide-bg)",
            }}
          >
            <CalendarClock className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
              Recurring sends
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--glide-muted)]">
              Rent, allowances, and subscriptions. Processed once per day on the
              server. Cancel anytime.
            </p>
          </div>
        </div>
        <ScheduledTransfersCard className="mt-4" />
      </div>
    </>
  );
}
