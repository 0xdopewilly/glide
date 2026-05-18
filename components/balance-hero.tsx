"use client";

import { GlidePillButton } from "@/components/glide-pill-button";
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
    <section className="flex flex-col items-start px-0 pb-2 pt-4 text-left">
      <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-600 dark:bg-[#1c1c1e] dark:text-white/80">
        USDC · Arc testnet
      </span>
      <h1
        className={`mt-4 text-[3.25rem] font-bold leading-[1.05] tracking-[-0.035em] text-neutral-950 dark:text-white sm:text-[3.5rem] ${
          loading ? "opacity-50" : ""
        }`}
      >
        ${formatUsd(balance)}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-neutral-500 dark:text-white/45">
        Your balance on Glide
      </p>
      <GlidePillButton
        type="button"
        onClick={onAddCash}
        disabled={loading}
        className="mt-6"
        icon={<Plus className="h-4 w-4" strokeWidth={2.5} />}
      >
        Add Cash
      </GlidePillButton>
    </section>
  );
}
