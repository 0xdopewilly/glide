"use client";

import type { ActivityKindFilter, ActivityPeriod } from "@/lib/activity";
import { RefreshCw } from "lucide-react";

const KIND_FILTERS: { id: ActivityKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "send", label: "Sent" },
  { id: "receive", label: "Received" },
  { id: "swap", label: "Swap" },
  { id: "bridge", label: "Bridge" },
];

const PERIOD_FILTERS: { id: ActivityPeriod; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
  { id: "year", label: "This year" },
];

export function ActivityToolbar({
  kind,
  period,
  count,
  onKindChange,
  onPeriodChange,
  onRefresh,
  refreshing,
}: {
  kind: ActivityKindFilter;
  period: ActivityPeriod;
  count: number;
  onKindChange: (k: ActivityKindFilter) => void;
  onPeriodChange: (p: ActivityPeriod) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-10 -mx-6 border-b px-6 pb-3 pt-1"
      style={{
        borderColor: "var(--glide-border)",
        background: "var(--glide-bg)",
      }}
    >
      <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KIND_FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            active={kind === f.id}
            onClick={() => onKindChange(f.id)}
            label={f.label}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIOD_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={period === f.id}
              onClick={() => onPeriodChange(f.id)}
              label={f.label}
              compact
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh activity"
          className="glide-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={2.25}
          />
        </button>
      </div>

      <p className="glide-label-mono mt-2 text-[10px] font-bold tabular-nums text-[var(--glide-muted)]">
        {count === 0
          ? "No transactions"
          : count === 1
            ? "1 transaction"
            : `${count} transactions`}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glide-tap shrink-0 rounded-full border font-semibold tracking-tight transition-colors ${
        compact ? "px-3 py-1 text-[10px]" : "px-4 py-1.5 text-[12px]"
      }`}
      style={
        active
          ? {
              background: "var(--glide-accent)",
              borderColor: "var(--glide-accent)",
              color: "var(--glide-bg)",
            }
          : {
              background: "var(--glide-surface-container)",
              borderColor: "var(--glide-border)",
              color: "var(--glide-muted)",
            }
      }
    >
      {label}
    </button>
  );
}
