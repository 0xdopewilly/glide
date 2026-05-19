"use client";

import { getChainMeta, type GlideChainKey } from "@/lib/chain-meta";
import Image from "next/image";
import { useState } from "react";

export function ChainIcon({
  chainId,
  size = "md",
}: {
  chainId: GlideChainKey;
  size?: "sm" | "md";
}) {
  const meta = getChainMeta(chainId);
  const dim = size === "sm" ? 16 : 20;
  const box = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const [failed, setFailed] = useState(false);

  if (meta.logo && !failed) {
    const contain = meta.logoFit === "contain";
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10 ${box} ${
          contain ? "bg-[#0b1120]" : "bg-white"
        }`}
        title={meta.label}
        aria-hidden
      >
        <Image
          src={meta.logo}
          alt=""
          width={dim}
          height={dim}
          className={contain ? "object-contain p-px" : "object-cover"}
          onError={() => setFailed(true)}
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${meta.badgeClass} ${box} ${size === "sm" ? "text-[8px]" : "text-[9px]"}`}
      title={meta.label}
      aria-hidden
    >
      {meta.shortLabel.slice(0, 3)}
    </span>
  );
}
