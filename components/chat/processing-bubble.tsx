"use client";

import type { ActionSuccessType } from "@/lib/chat-cache";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Globe2, Send } from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = {
  send: Send,
  swap: ArrowLeftRight,
  bridge: Globe2,
} as const;

const STAGES: Record<
  ActionSuccessType,
  { label: string; hint: string }[]
> = {
  send: [
    { label: "Sending", hint: "On Arc testnet" },
    { label: "Confirming", hint: "Almost there" },
  ],
  swap: [
    { label: "Swapping", hint: "USDC → EURC on Arc" },
    { label: "Confirming", hint: "On-chain — usually under a minute" },
    { label: "Finishing", hint: "Hang tight" },
  ],
  bridge: [
    { label: "Bridging", hint: "Cross-chain via CCTP" },
    { label: "Confirming", hint: "Can take a minute on testnet" },
    { label: "Finishing", hint: "Almost there" },
  ],
};

export function ProcessingBubble({ action }: { action: ActionSuccessType }) {
  const reduceMotion = useReducedMotion();
  const Icon = ICONS[action];
  const stages = STAGES[action];
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(0);
    if (stages.length <= 1) return;
    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % stages.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [action, stages.length]);

  const { label, hint } = stages[stageIndex] ?? stages[0];

  return (
    <motion.div
      className="flex w-full justify-end px-1 py-2"
      initial={{ opacity: 0, x: 12, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="flex min-w-[220px] max-w-[min(88%,280px)] items-center gap-3 rounded-2xl rounded-br-md px-4 py-3 glide-surface-card"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
          {!reduceMotion ? (
            <motion.span
              className="absolute inset-0 rounded-xl ring-2 ring-violet-500/50"
              animate={{ opacity: [0.2, 0.85, 0.2], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </span>
        <motion.div
          key={`${action}-${stageIndex}`}
          className="min-w-0 flex-1 text-left"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {label}…
          </p>
          <p className="text-xs text-neutral-600 dark:text-white/55">{hint}</p>
          <motion.div
            className="relative mt-2 h-0.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10"
            aria-hidden
          >
            <motion.div
              className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              animate={reduceMotion ? undefined : { left: ["-50%", "120%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
