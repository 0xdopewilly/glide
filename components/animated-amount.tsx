"use client";

import { useLiteMotion } from "@/hooks/use-lite-motion";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Amount display with a quick digit pop — no layout shift (tabular nums). */
export function AnimatedAmount({
  value,
  prefix,
  className = "",
  prefixClassName = "mr-0.5 text-[0.58em] font-bold opacity-50",
  amountClassName = "",
}: {
  value: string;
  prefix?: string;
  className?: string;
  prefixClassName?: string;
  amountClassName?: string;
}) {
  const liteMotion = useLiteMotion();

  return (
    <span
      className={`inline-flex items-baseline justify-center tabular-nums ${className}`}
    >
      {prefix ? (
        <span className={`shrink-0 ${prefixClassName}`}>{prefix}</span>
      ) : null}
      <span className="relative inline-flex min-w-[1ch] justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={
              liteMotion ? false : { opacity: 0, y: 8, scale: 0.98 }
            }
            animate={liteMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={liteMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.16, ease: EASE }}
            className={`inline-block origin-bottom ${amountClassName}`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
