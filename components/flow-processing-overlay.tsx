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
    <span
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
      style={{
        background: "var(--glide-surface-container-high)",
        borderColor: "var(--glide-border)",
      }}
    >
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
      className="absolute inset-0 z-20 flex items-center justify-center px-6"
      style={{
        background: "color-mix(in srgb, var(--glide-bg) 88%, transparent)",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="slide-up-bouncy w-full max-w-[300px] rounded-[28px] border px-6 py-7 text-center"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
          boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div className="flex items-center justify-center gap-3">
          {mode === "swap" ? (
            <>
              <FlowIcon>
                <TokenIcon symbol="USDC" size={44} />
              </FlowIcon>
              <span
                className="glide-arrow-pulse flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: "var(--glide-accent)",
                  color: "var(--glide-bg)",
                }}
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <FlowIcon>
                <TokenIcon symbol="EURC" size={44} />
              </FlowIcon>
            </>
          ) : (
            <>
              <FlowIcon>
                <TokenIcon symbol="USDC" size={44} />
              </FlowIcon>
              <span
                className="glide-arrow-pulse flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: "var(--glide-accent)",
                  color: "var(--glide-bg)",
                }}
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <FlowIcon>
                {bridgeChainId ? (
                  <ChainIcon chainId={bridgeChainId} />
                ) : (
                  <span
                    className="text-base font-bold"
                    style={{ color: "var(--glide-text)" }}
                  >
                    →
                  </span>
                )}
              </FlowIcon>
            </>
          )}
        </div>

        <div
          className="relative mx-auto mt-7 h-1 w-full max-w-[220px] overflow-hidden rounded-full"
          style={{ background: "var(--glide-surface-container)" }}
          aria-hidden
        >
          <span
            className="glide-processing-bar-indeterminate absolute inset-y-0 left-0 w-2/5 rounded-full"
            style={{ background: "var(--glide-accent)" }}
          />
        </div>

        <p
          className="mt-6 text-[18px] font-bold tracking-tight"
          style={{ color: "var(--glide-text)" }}
        >
          {title}…
        </p>
        <p
          className="glide-label-mono mt-1 text-[11px] font-semibold"
          style={{ color: "var(--glide-muted)" }}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
