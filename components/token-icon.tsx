"use client";

import {
  Bitcoin,
  CircleDollarSign,
  DollarSign,
  Euro,
  type LucideIcon,
} from "lucide-react";

type TokenVisual = { bg: string; Icon: LucideIcon };

// Brand-colored coin badges. Keys are normalized to UPPERCASE; the lookup also
// strips common decorative prefixes like "CIR" so cirBTC / CIRBTC / BTC all
// resolve to the bitcoin visual.
const TOKEN_VISUALS: Record<string, TokenVisual> = {
  USDC: { bg: "#2775CA", Icon: DollarSign },
  EURC: { bg: "#3B82F6", Icon: Euro },
  CIRBTC: { bg: "#5B3DF5", Icon: Bitcoin },
  BTC: { bg: "#5B3DF5", Icon: Bitcoin },
};

const FALLBACK: TokenVisual = { bg: "#5D6B85", Icon: CircleDollarSign };

function resolveVisual(symbol: string): TokenVisual {
  const key = symbol.trim().toUpperCase();
  if (TOKEN_VISUALS[key]) return TOKEN_VISUALS[key];
  // Strip a leading "CIR" prefix (e.g. cirBTC, cirETH).
  if (key.startsWith("CIR") && TOKEN_VISUALS[key.slice(3)]) {
    return TOKEN_VISUALS[key.slice(3)];
  }
  return FALLBACK;
}

export function TokenIcon({
  symbol,
  size = 40,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const { bg, Icon } = resolveVisual(symbol);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? ""}`}
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-hidden
    >
      <Icon
        className="text-white"
        style={{ width: size * 0.55, height: size * 0.55 }}
        strokeWidth={2.5}
      />
    </span>
  );
}
