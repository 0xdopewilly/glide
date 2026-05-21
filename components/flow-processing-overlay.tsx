"use client";

import { ChainIcon } from "@/components/chain-icon";
import { TokenIcon } from "@/components/token-icon";
import type { GlideChainKey } from "@/lib/chain-meta";
import { ArrowRight } from "lucide-react";

const LABELS = {
  swap: {
    title: "Swapping",
    defaultSubtitle: "USDC → EURC on Arc",
  },
  bridge: {
    title: "Bridging",
    defaultSubtitle: "Sending USDC cross-chain",
  },
} as const;

function FlowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      {children}
    </span>
  );
}

export function FlowProcessingOverlay({
  open,
  mode,
  subtitle,
  bridgeChainId,
}: {
  open: boolean;
  mode: "swap" | "bridge";
  subtitle?: string;
  bridgeChainId?: GlideChainKey;
}) {
  if (!open) return null;

  const { title, defaultSubtitle } = LABELS[mode];
  const detail = subtitle ?? defaultSubtitle;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-[280px] rounded-3xl px-6 py-7 text-center shadow-xl glide-surface-card">
        <div className="flex items-center justify-center gap-2.5">
          {mode === "swap" ? (
            <>
              <FlowIcon>
                <TokenIcon symbol="USDC" size={40} />
              </FlowIcon>
              <span
                className="glide-processing-arrow flex h-8 w-8 items-center justify-center text-violet-500 dark:text-violet-300"
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <FlowIcon>
                <TokenIcon symbol="EURC" size={40} />
              </FlowIcon>
            </>
          ) : (
            <>
              <FlowIcon>
                <TokenIcon symbol="USDC" size={40} />
              </FlowIcon>
              <span
                className="glide-processing-arrow flex h-8 w-8 items-center justify-center text-violet-500 dark:text-violet-300"
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <FlowIcon>
                {bridgeChainId ? (
                  <ChainIcon chainId={bridgeChainId} size="sm" />
                ) : (
                  <span className="text-xs font-semibold text-violet-600">→</span>
                )}
              </FlowIcon>
            </>
          )}
        </div>

        <div
          className="relative mx-auto mt-6 h-0.5 w-full max-w-[200px] overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10"
          aria-hidden
        >
          <span className="glide-processing-bar-indeterminate absolute inset-y-0 left-0 w-2/5 rounded-full bg-violet-500 dark:bg-violet-400" />
        </div>

        <p className="mt-5 text-base font-semibold tracking-tight">{title}…</p>
        <p className="mt-0.5 text-sm glide-muted">{detail}</p>
      </div>
    </div>
  );
}
