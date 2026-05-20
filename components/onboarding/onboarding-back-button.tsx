"use client";

import { ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function OnboardingBackButton({ onClick }: { onClick: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: reduceMotion ? 1 : 1.01 }}
      className="glide-tonal-card glide-tap flex shrink-0 items-center justify-center gap-1 rounded-full border-0 px-5 py-[1.05rem] text-[15px] font-semibold tracking-tight text-[var(--glide-text)]"
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), sans-serif" }}
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      Back
    </motion.button>
  );
}
