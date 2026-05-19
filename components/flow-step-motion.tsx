"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Slide between steps inside a flow (form → success). */
export function FlowStepMotion({
  stepKey,
  children,
  direction = 1,
}: {
  stepKey: string;
  children: React.ReactNode;
  direction?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={{ x: direction > 0 ? "40%" : "-40%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction > 0 ? "-20%" : "20%", opacity: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
