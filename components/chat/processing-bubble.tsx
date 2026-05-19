"use client";

import type { ActionSuccessType } from "@/lib/chat-cache";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Globe2, Send } from "lucide-react";

const COPY: Record<
  ActionSuccessType,
  { label: string; hint: string; Icon: typeof Send }
> = {
  send: { label: "Sending", hint: "On Arc testnet", Icon: Send },
  swap: { label: "Swapping", hint: "USDC → EURC", Icon: ArrowLeftRight },
  bridge: { label: "Bridging", hint: "Cross-chain transfer", Icon: Globe2 },
};

export function ProcessingBubble({ action }: { action: ActionSuccessType }) {
  const reduceMotion = useReducedMotion();
  const { label, hint, Icon } = COPY[action];

  return (
    <motion.div
      className="flex w-full justify-end px-1 py-2"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      <motion.div
        className="glide-processing-card flex min-w-[200px] items-center gap-3 rounded-2xl rounded-br-md px-4 py-3"
        animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        role="status"
        aria-busy="true"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <span className="glide-processing-ring absolute inset-0 rounded-xl opacity-80" />
          <Icon className="relative h-5 w-5 text-white" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold">{label}…</p>
          <p className="text-xs text-white/70">{hint}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
