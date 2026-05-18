"use client";

import { motion } from "framer-motion";

export function OnboardingProgress({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      className="flex flex-1 gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--glide-text)_12%,transparent)]"
        >
          <motion.div
            className="h-full rounded-full bg-[var(--glide-text)]"
            initial={false}
            animate={{
              width: i <= current ? "100%" : "0%",
              opacity: i <= current ? 1 : 0.35,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}
    </div>
  );
}
