"use client";

import { motion } from "framer-motion";

export function OnboardingDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      className="flex justify-center gap-1.5 pb-5 pt-2"
      role="tablist"
      aria-label="Onboarding steps"
    >
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          role="tab"
          aria-selected={i === current}
          className="h-1 rounded-full bg-neutral-950 dark:bg-white"
          layout
          initial={false}
          animate={{
            width: i === current ? 28 : 8,
            opacity: i === current ? 1 : 0.25,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 28,
          }}
        />
      ))}
    </div>
  );
}
