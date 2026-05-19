"use client";

import type { TransactionKind } from "@/lib/types";

const FILTERS: { id: "all" | TransactionKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "send", label: "Sent" },
  { id: "receive", label: "Received" },
  { id: "swap", label: "Swap" },
  { id: "bridge", label: "Bridge" },
];

export function ActivityFilters({
  value,
  onChange,
}: {
  value: "all" | TransactionKind;
  onChange: (v: "all" | TransactionKind) => void;
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`glide-tap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors ${
              active
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                : "bg-neutral-100 text-neutral-600 dark:bg-[#1c1c1e] dark:text-white/65"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
