"use client";

import { formatUsd } from "@/lib/format";
import { Plus } from "lucide-react";

export function BalanceHero({
  balance,
  onAddCash,
  loading,
}: {
  balance: number;
  onAddCash: () => void;
  loading?: boolean;
}) {
  return (
    <section className="flex flex-col items-center px-2 pb-2 pt-6 text-center">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--glide-muted)" }}
        translate="no"
      >
        USDC
      </p>
      <h1
        className={`mt-2 text-[3.25rem] font-semibold leading-none tracking-tight sm:text-[3.5rem] ${
          loading ? "opacity-50" : ""
        }`}
      >
        ${formatUsd(balance)}
      </h1>
      <button
        type="button"
        onClick={onAddCash}
        disabled={loading}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
          color: "var(--glide-text)",
        }}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Add Cash
      </button>
    </section>
  );
}
