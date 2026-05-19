"use client";

import { getChainMeta, type GlideChainKey } from "@/lib/chain-meta";

export function ChainIcon({
  chainId,
  size = "md",
}: {
  chainId: GlideChainKey;
  size?: "sm" | "md";
}) {
  const meta = getChainMeta(chainId);
  const dim = size === "sm" ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-[9px]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${meta.badgeClass} ${dim}`}
      title={meta.label}
      aria-hidden
    >
      {meta.shortLabel.slice(0, 3)}
    </span>
  );
}
