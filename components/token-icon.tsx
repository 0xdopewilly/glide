"use client";

import { getTokenLogo } from "@/lib/token-meta";
import Image from "next/image";
import { useState } from "react";

export function TokenIcon({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const logo = getTokenLogo(symbol);
  const [failed, setFailed] = useState(false);
  const initial = symbol.trim().charAt(0) || "?";

  if (!logo || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-bold text-white"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5 dark:ring-white/10"
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        className="object-cover"
        onError={() => setFailed(true)}
        unoptimized
      />
    </span>
  );
}
