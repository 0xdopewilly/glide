"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownUp, Globe2 } from "lucide-react";

const LABELS = {
  swap: {
    title: "Swapping",
    subtitle: "USDC → EURC on Arc",
    Icon: ArrowDownUp,
  },
  bridge: {
    title: "Bridging",
    subtitle: "Arc → destination chain",
    Icon: Globe2,
  },
} as const;

/** Full-screen processing state for swap / bridge flows. */
export function FlowProcessingOverlay({
  open,
  mode,
}: {
  open: boolean;
  mode: "swap" | "bridge";
}) {
  const reduceMotion = useReducedMotion();
  const { title, subtitle, Icon } = LABELS[mode];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-black/75 px-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            className="glide-processing-glow pointer-events-none absolute h-56 w-56 rounded-full"
            animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col items-center">
            <motion.div
              className="relative flex h-28 w-28 items-center justify-center"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <span className="glide-processing-ring absolute inset-0 rounded-full" />
              <span className="glide-processing-ring glide-processing-ring--delay absolute inset-2 rounded-full" />
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--glide-accent)" }}
              >
                <Icon className="h-8 w-8 text-white" strokeWidth={2.25} />
              </span>
            </motion.div>
            {!reduceMotion ? (
              <>
                <motion.span
                  className="absolute -left-3 top-6 h-3 w-3 rounded-full bg-violet-400"
                  animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="absolute -right-2 top-10 h-2.5 w-2.5 rounded-full bg-sky-400"
                  animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.3, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="absolute bottom-4 left-4 h-2 w-2 rounded-full bg-emerald-400"
                  animate={{ y: [0, -8, 0], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.35 }}
                />
              </>
            ) : null}
            <p className="mt-8 text-xl font-bold tracking-tight">{title}…</p>
            <p className="mt-1.5 text-sm glide-muted">{subtitle}</p>
            <div className="mt-6 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-white/80"
                  animate={reduceMotion ? undefined : { y: [0, -6, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
