"use client";

import { AnimatePresence, motion } from "framer-motion";

export function AnimatedAmount({
  value,
  prefix = "$",
  className = "",
}: {
  value: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      {prefix ? (
        <span className="mr-1 opacity-80">{prefix}</span>
      ) : null}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -12, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
