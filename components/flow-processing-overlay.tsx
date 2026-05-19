"use client";

import { ChainIcon } from "@/components/chain-icon";
import { TokenIcon } from "@/components/token-icon";
import type { GlideChainKey } from "@/lib/chain-meta";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

function FlowIcon({
  children,
  reduceMotion,
}: {
  children: React.ReactNode;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.span
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
      animate={
        reduceMotion
          ? undefined
          : { boxShadow: ["0 4px 14px rgba(0,0,0,0.08)", "0 8px 24px rgba(124,58,237,0.18)", "0 4px 14px rgba(0,0,0,0.08)"] }
      }
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
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
  const reduceMotion = useReducedMotion();
  const { title, defaultSubtitle } = LABELS[mode];
  const detail = subtitle ?? defaultSubtitle;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            className="w-full max-w-[280px] rounded-3xl px-6 py-7 text-center shadow-xl glide-surface-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
          >
            <motion.div
              className="flex items-center justify-center gap-2.5"
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              {mode === "swap" ? (
                <>
                  <FlowIcon reduceMotion={reduceMotion}>
                    <TokenIcon symbol="USDC" size={40} />
                  </FlowIcon>
                  <motion.span
                    className="flex h-8 w-8 items-center justify-center text-violet-500 dark:text-violet-300"
                    animate={reduceMotion ? undefined : { x: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </motion.span>
                  <FlowIcon reduceMotion={reduceMotion}>
                    <TokenIcon symbol="EURC" size={40} />
                  </FlowIcon>
                </>
              ) : (
                <>
                  <FlowIcon reduceMotion={reduceMotion}>
                    <TokenIcon symbol="USDC" size={40} />
                  </FlowIcon>
                  <motion.span
                    className="flex h-8 w-8 items-center justify-center text-violet-500 dark:text-violet-300"
                    animate={reduceMotion ? undefined : { x: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </motion.span>
                  <FlowIcon reduceMotion={reduceMotion}>
                    {bridgeChainId ? (
                      <ChainIcon chainId={bridgeChainId} size="sm" />
                    ) : (
                      <span className="text-xs font-semibold text-violet-600">→</span>
                    )}
                  </FlowIcon>
                </>
              )}
            </motion.div>

            <div
              className="relative mx-auto mt-6 h-0.5 w-full max-w-[200px] overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10"
              aria-hidden
            >
              <motion.div
                className="absolute inset-y-0 w-2/5 rounded-full bg-violet-500 dark:bg-violet-400"
                animate={
                  reduceMotion
                    ? { left: "30%", width: "40%" }
                    : { left: ["-40%", "100%"] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 1.25, repeat: Infinity, ease: "easeInOut" }
                }
              />
            </div>

            <p className="mt-5 text-base font-semibold tracking-tight">{title}…</p>
            <p className="mt-0.5 text-sm glide-muted">{detail}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
